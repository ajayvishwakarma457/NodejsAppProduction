# Circuit Breaker Pattern

This document details the architectural patterns, state transitions, configurations, and code integrations for the **Circuit Breaker** pattern using the standard **Opossum** library in our Node.js microservices architecture.

---

## 1. Architectural Concepts

In a distributed environment, services make remote calls to other microservices running on separate servers. Remote calls can fail or hang due to network bottlenecks, server crashes, or heavy load.

If a calling service keeps sending requests to a struggling dependency, it can run out of critical resources (sockets, threads, or memory) waiting for timeouts. This causes **cascading failures** across the platform.

The **Circuit Breaker** pattern prevents this by wrapping remote calls in a stateful proxy:
* **CLOSED**: Requests flow normally. If the failure rate exceeds a specified threshold, the circuit trips (opens).
* **OPEN**: Requests fail-fast immediately, returning a fallback response without calling the target service. This protects the failing service and frees client resources.
* **HALF-OPEN**: After a configured reset timeout, the breaker enters a recovery state where it lets a limited number of requests pass through. If they succeed, it closes the circuit (heals); if any fail, it trips back to Open.

```
          [Succeeds]
     +-----------------+
     |                 |
     v                 |
+----------+       +-----------+
|  CLOSED  | ----> |   OPEN    |
+----------+       +-----------+
     ^                 |
     |                 | [Reset Timeout Expires]
     |                 v
     +------------ | HALF-OPEN |
    [Succeeds]     +-----------+
```

---

## 2. Shared Opossum Utility

We created a generic, reusable Circuit Breaker factory wrapper using the production-ready `opossum` package:

### A. Factory Setup (`src/utils/circuitBreaker.js`)
Configures threshold percentages, reset limits, and sets up state logging listeners:

```javascript
const CircuitBreaker = require('opossum');
const logger = require('./logger');

const defaultOptions = {
  timeout: 3000, // Trigger failure if response takes > 3s
  errorThresholdPercentage: 50, // Trip circuit if failure rate reaches 50%
  resetTimeout: 10000, // Wait 10 seconds in OPEN before testing recovery
};

const createCircuitBreaker = (action, options = {}) => {
  const breaker = new CircuitBreaker(action, { ...defaultOptions, ...options });

  breaker.on('reject', () => logger.warn('[Circuit Breaker] Execution rejected - Circuit is currently OPEN!'));
  breaker.on('open', () => logger.error('[Circuit Breaker] STATUS TRANSITION: CLOSED -> OPEN (Tripped)'));
  breaker.on('close', () => logger.info('[Circuit Breaker] STATUS TRANSITION: OPEN/HALF-OPEN -> CLOSED (Recovered)'));
  breaker.on('halfOpen', () => logger.info('[Circuit Breaker] STATUS TRANSITION: OPEN -> HALF-OPEN (Testing downstream...)'));

  return breaker;
};
```

---

## 3. API Gateway gRPC Integration

We wrapped the API Gateway's synchronous gRPC User Service lookup with this Circuit Breaker:

### A. Implementation (`microservices/api-gateway/index.js`)
* Convert the callback-based gRPC call into a Promise.
* Use `errorFilter` so that business logic failures (like User 404 Not Found) do not trip the circuit breaker. Only infrastructure errors (like network timeouts or connection failures) contribute to the failure rate.
* Configure a safe **fallback response** for service outages.

```javascript
const fetchUserViaGrpc = (id) => {
  return new Promise((resolve, reject) => {
    userClient.getUserInfo({ id }, (err, response) => {
      if (err) {
        if (err.code === grpc.status.NOT_FOUND) {
          const notFoundError = new Error('User not found');
          notFoundError.statusCode = 404;
          return reject(notFoundError);
        }
        return reject(err);
      }
      resolve(response);
    });
  });
};

const userGrpcBreaker = createCircuitBreaker(fetchUserViaGrpc, {
  errorFilter: (err) => err.statusCode === 404
});

// Safe Fallback Payload
userGrpcBreaker.fallback((id, err) => {
  if (err && err.statusCode === 404) throw err;
  return {
    id,
    name: 'Anonymous (Circuit Fallback)',
    email: 'offline-mode@gateway.local',
    role: 'user',
    createdAt: new Date().toISOString(),
    _isFallback: true
  };
});
```

---

## 4. Verification & Testing

### Automated Integration Tests
Verify state transitions, fail-fast operations, and fallback activations by running the Jest test suite:
```bash
npm test tests/integration/circuitBreaker.test.js
```

### Manual Outage Simulation
1. Start the microservice network:
   ```bash
   npm run start:microservices
   ```
2. Retrieve user data via the Gateway gRPC endpoint:
   ```bash
   curl http://localhost:6000/api/v1/grpc-user/<valid_user_id>
   ```
3. Stop/Kill the **User Identity Service** process.
4. Call the Gateway endpoint again. You will immediately receive the fallback object representing the offline mode context:
   ```json
   {
     "status": "success",
     "data": {
       "id": "<valid_user_id>",
       "name": "Anonymous (Circuit Fallback)",
       "email": "offline-mode@gateway.local",
       "role": "user",
       "_isFallback": true
     }
   }
   ```
5. Observe the API Gateway logs showing the circuit tripping to the `OPEN` state.
