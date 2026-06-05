# Service Discovery & Load Balancing

This document details the architectural design, setup procedures, and code integrations for dynamic **Service Discovery** and client-side **Load Balancing** inside our microservices architecture, as well as outlining production alternatives (**Nginx**, **Consul**, **AWS ALB**, **Kubernetes DNS**).

---

## 1. Architectural Concepts

In distributed microservices, application instances scale up or down dynamically, binding to variable IPs and random ports. Hardcoding target destinations (e.g. `http://localhost:6001`) causes routing failures and prevents horizontal scaling. 

To solve this, we split service resolution into two distinct systems:
1. **Service Registry**: A centralized directory where services declare their health and network location.
2. **Load Balancer**: A component that reads from the service registry and distributes requests across multiple healthy targets using routing algorithms like **Round-Robin**.

---

## 2. Shared Redis Registry Implementation

We implemented a custom, lightweight Service Registry utility using Redis Sorted Sets (`ZSET`), allowing multi-instance dynamic mapping.

### A. Dynamic Service Registration & Heartbeat
When a microservice boots up (e.g., User Service or Notification Service), it registers its address (`http://127.0.0.1:<port>`) in Redis with an expiration timestamp. A continuous background heartbeat refreshes this expiration to prevent stale mappings if an instance crashes.

* **Registry Key**: `registry:<serviceName>`
* **Data Structure**: Redis ZSET. The member is the instance URL, and the score is the Unix expiration timestamp.

```javascript
// src/utils/serviceRegistry.js
const expiration = Math.floor(Date.now() / 1000) + ttlSeconds;
await redisClient.zadd(`registry:${serviceName}`, expiration, instanceUrl);
```

### B. Graceful Shutdown (Process Cleanup)
To ensure immediate removal from routing when an instance is stopped, we hook into Node process lifecycle termination signals:

```javascript
const shutdown = async () => {
  stopHeartbeat();
  await serviceRegistry.deregisterInstance('user-service', instanceUrl);
  serverInstance.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

### C. Client-Side Round-Robin Load Balancing
The API Gateway ([api-gateway/index.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/microservices/api-gateway/index.js)) keeps an in-memory cache of healthy targets. It refreshes this cache asynchronously every 2 seconds to avoid adding Redis lookup latency to the critical request path.

When routing requests to downstreams, the proxy uses Round-Robin index calculations:

```javascript
const getServiceHost = (serviceName, fallbackUrl) => {
  const hosts = serviceHosts[serviceName];
  if (!hosts || hosts.length === 0) return fallbackUrl;

  const index = roundRobinIndex[serviceName] % hosts.length;
  roundRobinIndex[serviceName]++;
  return hosts[index];
};
```

---

## 3. Production Service Discovery Alternatives

For enterprise cloud environments, instead of using custom Redis ZSET registries, teams rely on dedicated infrastructure:

### A. Nginx Upstream (Server-Side Load Balancing)
Nginx sits in front of your service cluster. The Gateway routes calls to Nginx, and Nginx balances them across a defined set of servers:

```nginx
upstream user_service_pool {
    server 10.0.0.10:6001 weight=3;
    server 10.0.0.11:6001;
    server 10.0.0.12:6001 backup;
}

server {
    location /api/v1/users {
        proxy_pass http://user_service_pool;
    }
}
```

### B. AWS Application Load Balancer (ALB)
* Integrates directly with AWS **ECS/Fargate** or **EC2 Auto Scaling Groups**.
* As container tasks spin up, they register with a **Target Group**.
* The ALB performs health checks automatically, routes traffic to healthy containers, and handles SSL/TLS termination at the load-balancing boundary.

### C. HashiCorp Consul (Registry-Based)
* Service instances register with Consul on startup.
* Clients query Consul via DNS (`user-service.service.consul`) or HTTP API to discover instance IPs.
* Provides built-in distributed locks, key-value configurations, and service mesh routing.

### D. Kubernetes DNS (CoreDNS)
* Kubernetes runs a CoreDNS server inside the cluster.
* When you declare a Kubernetes **Service** resource named `user-service`, K8s automatically binds it to a cluster IP and creates a DNS entry: `http://user-service.default.svc.cluster.local`.
* K8s internal load-balances traffic across active Pods matching the selector automatically, completely removing the need for manual registry heartbeats in application code.
