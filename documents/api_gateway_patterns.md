# API Gateway Patterns (Kong, AWS API Gateway, Nginx, Custom Node.js)

This document details the architectural design, setup procedures, and code/configuration mappings for core API Gateway patterns using standard industry proxies (**Nginx**, **Kong**, **AWS API Gateway**) and our custom Node.js Express Gateway implementation.

---

## 1. Gateway Pattern Responsibilities

The API Gateway acts as a reverse proxy, insulating private microservice endpoints from the public internet. Common gateway patterns include:

* **Reverse Proxying / Routing**: Routing URI paths to the corresponding microservice host.
* **Authentication Offloading**: Decrypting and validating credentials (like JWTs or API keys) at the edge layer, then injecting identity context into downstreams.
* **Rate Limiting**: Defending downstream services by throttling requests at the edge.
* **Request Transformation**: Scrubbing or injecting headers (like correlation IDs or client IPs).

---

## 2. custom Node.js Gateway Implementation

In our custom Node.js monorepo architecture, we offload authentication and route traffic dynamically.

### A. Authentication Offloading (API Gateway)
Located in `microservices/api-gateway/index.js`, the Gateway checks for a Bearer JWT, verifies it at the edge layer, and decorates proxied request headers:

```javascript
const gatewayAuthParser = (req, res, next) => {
  let token = req.headers.authorization?.startsWith('Bearer') 
    ? req.headers.authorization.split(' ')[1] 
    : req.query.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Injects payload { id, role }
    } catch (err) {
      logger.warn(`Token rejected at gateway: ${err.message}`);
    }
  }
  next();
};
```

### B. Header Injection & Forwarding
We pass offloaded user credentials to downstreams using `proxyReqOptDecorator`:

```javascript
const proxyOptions = {
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    if (srcReq.user) {
      proxyReqOpts.headers['x-user-id'] = srcReq.user.id;
      proxyReqOpts.headers['x-user-role'] = srcReq.user.role || 'user';
    }
    return proxyReqOpts;
  }
};
```

---

## 3. Nginx Configuration Setup

**Nginx** is a high-performance reverse proxy. It performs SSL/TLS termination, request routing, and header enrichment.

### Example `nginx.conf`
```nginx
events { worker_connections 1024; }

http {
    # Define rate limiting zones (10 requests per second limit per IP)
    limit_req_zone $binary_remote_addr zone=mylimit:10m rate=10r/s;

    upstream user_service {
        server localhost:6001;
    }

    upstream notification_service {
        server localhost:6002;
    }

    server {
        listen 80;
        server_name api.productionplatform.com;

        # Redirect to HTTPS
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.productionplatform.com;

        ssl_certificate /etc/ssl/certs/api_gateway.crt;
        ssl_certificate_key /etc/ssl/private/api_gateway.key;

        # Global Rate Limiting
        limit_req zone=mylimit burst=20 nodelay;

        # User Service REST Proxy Routing
        location /api/v1/users {
            proxy_pass http://user_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Inject Gateway Authentication Context
            proxy_set_header X-User-Id $http_x_user_id;
        }

        # Notification Service REST Proxy Routing
        location /api/v1/notifications {
            proxy_pass http://notification_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

---

## 4. Kong Declarative Configuration (DecK / YAML)

**Kong** is built on Nginx (via OpenResty) and offers a rich, plugin-based middleware pipeline.

### Example `kong.yml`
```yaml
_format_version: "2.1"

services:
  - name: user-service
    url: http://localhost:6001
    routes:
      - name: user-routes
        paths:
          - /api/v1/users
          - /api/v1/auth
    plugins:
      # Enable Kong JWT Plugin at the Edge layer
      - name: jwt
        config:
          key_claim_name: kid
          secret_is_base64: false
      # Enable Rate Limiting (100 requests per minute per IP)
      - name: rate-limiting
        config:
          minute: 100
          policy: local

  - name: notification-service
    url: http://localhost:6002
    routes:
      - name: notification-routes
        paths:
          - /api/v1/notifications
```

---

## 5. AWS API Gateway Pattern Setup

**AWS API Gateway** is a fully managed serverless gateway pattern.

### Architecture Map
```
Client ---> [AWS API Gateway] ---> [Lambda Authorizer]
                    | (Token valid)
                    v
          [Private VPC Link / HTTP Integration] ---> [Microservice (Fargate/ECS)]
```

### Setup Workflow
1. **HTTP/REST API Creation**: Initialize a REST API in AWS API Gateway console or via Terraform.
2. **Lambda Authorizer**:
   * Deploy a lightweight Node.js Lambda function checking the incoming `Authorization: Bearer <JWT>` header.
   * On validation success, return an IAM Policy allowing access:
     ```json
     {
       "principalId": "user_id_123",
       "policyDocument": {
         "Version": "2012-10-17",
         "Statement": [{
           "Action": "execute-api:Invoke",
           "Effect": "Allow",
           "Resource": "arn:aws:execute-api:us-east-1:*:*/*"
         }]
       },
       "context": {
         "userId": "user_id_123",
         "role": "admin"
       }
     }
     ```
3. **Request Mapping & Integration**:
   * Attach the Lambda authorizer to the `/api/v1/users` route.
   * Configure **Integration Request** parameters to inject context headers:
     * Mapping Header Name: `x-user-id` -> Value: `context.authorizer.userId`
     * Mapping Header Name: `x-user-role` -> Value: `context.authorizer.role`
4. **Throttling (Usage Plans)**:
   * Setup Usage Plans linked to API Keys to enforce client-specific rate limits and quotas at the Gateway boundary.
