# Correlation IDs for Request Tracing

This document outlines the architecture, configuration, and implementation of **Correlation IDs for Request Tracing** in our Node.js production application.

---

## 1. Why Correlation IDs?

In production, microservices and backend APIs process thousands of concurrent requests. When an exception occurs or latency spikes, diagnosing the root cause is difficult because log lines from different requests interleave.

**Correlation IDs** solve this by:
* Assigning a unique transaction identifier (UUID) to every incoming request.
* Injecting that ID into every log message emitted during that request's execution path (routes, controllers, models).
* Forwarding the ID to downstream APIs, database logs, and returning it in the client HTTP response headers (`X-Correlation-ID`).

This allows engineers to search a log aggregator (like Datadog, Kibana, or Grafana Loki) for a specific ID and view the complete sequence of events for that request.

---

## 2. Context Isolation via Asynchronous Local Storage (ALS)

In Node.js, we track correlation IDs across asynchronous callback chains using the built-in `async_hooks` module's **`AsyncLocalStorage` (ALS)**. This acts like thread-local storage in multi-threaded runtimes.

We configured the store in [tracer.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/utils/tracer.js):

```javascript
const { AsyncLocalStorage } = require('async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();
module.exports = asyncLocalStorage;
```

---

## 3. Tracing Middleware Configuration

We created [correlationIdMiddleware.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/middlewares/v1/correlationIdMiddleware.js) to wrap each request's execution context:

```javascript
const crypto = require('crypto');
const asyncLocalStorage = require('../../utils/tracer');

const correlationIdMiddleware = (req, res, next) => {
  // 1. Read existing ID or generate a fresh UUID
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();

  // 2. Set response header for client visibility
  res.setHeader('X-Correlation-ID', correlationId);
  req.correlationId = correlationId;

  // 3. Run all subsequent middlewares inside the ALS store context
  asyncLocalStorage.run({ correlationId }, () => {
    next();
  });
};
```

Mounting this globally in [app.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/app.js) enables tracing across all routes.

---

## 4. Injecting Correlation IDs in Winston

We updated [logger.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/utils/logger.js) to intercept and append the correlation ID if a context is active:

```javascript
const injectCorrelationId = winston.format((info) => {
  const store = asyncLocalStorage.getStore();
  if (store && store.correlationId) {
    info.correlationId = store.correlationId;
  }
  return info;
});
```

---

## 5. Visual Log Output

When requests are hit, the console format includes the Correlation ID automatically:

```bash
[2026-06-05 14:36:29:362] [http] [CID: 930ffc87-405c-4c8a-ab6d-b48c9be59d5e]: POST /api/v1/auth/register 201 1.773 ms - 475
```

In production environments, it is saved in structured JSON, making searching simple:

```json
{"method":"POST","url":"/api/v1/auth/register","status":201,"responseTime":"1.773 ms","correlationId":"930ffc87-405c-4c8a-ab6d-b48c9be59d5e","level":"http","timestamp":"2026-06-05T09:06:29.362Z"}
```
