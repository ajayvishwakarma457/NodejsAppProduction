# Log Levels: error, warn, info, http, debug

This document defines the configuration, usage guidelines, and implementation of **log levels** in our production Node.js application.

---

## 1. Defining Log Levels

We use the standard RFC 5424 severity levels supported natively by Winston. Each level is assigned an integer priority (lower numbers indicate higher severity):

| Level | Priority | Description & Usage Criteria |
| :--- | :--- | :--- |
| **`error`** | 0 | **Critical System Faults**: Unhandled system exceptions, database connection errors, third-party API failures, or worker crashes that require immediate attention. |
| **`warn`** | 1 | **Operational Anomalies**: Expected client-side errors (validation failures, failed logins, bad requests) or degraded runtime states that do not represent application crashes. |
| **`info`** | 2 | **Significant Lifecycle Events**: Server boot events, starting database pools, cron schedules triggering, worker registration, and graceful shutdowns. |
| **`http`** | 3 | **Request/Response Metrics**: Automatically generated HTTP traffic logs containing endpoints, HTTP verbs, response statuses, latencies, and payload sizes. |
| **`debug`** | 4 | **Verbose Diagnostic Information**: High-volume telemetry useful only during development or investigation, such as raw session data states, query payloads, or execution trace markers. |

---

## 2. Dynamic Log Level Selection

Log levels are dynamically capped based on the target runtime environment (`NODE_ENV`):
* **Development & Testing**: Level is set to `debug` (meaning logs of all levels `debug` down to `error` are printed).
* **Production**: Level is set to `info` (meaning high-volume `http` and `debug` telemetry is filtered out from console/file logs to protect disk space and enhance performance, leaving only `info`, `warn`, and `error` metrics).

---

## 3. Real Implementation Examples

We replaced standard `console.log` and `console.error` calls with appropriate levels across the application layers:

### A. Logging Critical Errors (`logger.error`)
In [server.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/server.js) during database connection or worker initialization failures:
```javascript
sessionRedisClient.on('error', (err) => {
  logger.error('Session Redis Client Error:', err);
});
```

### B. Logging Operational Warnings (`logger.warn`)
In [errorMiddleware.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/middlewares/v1/errorMiddleware.js) for handling client validation failures:
```javascript
logger.warn(`Operational Warning: ${err.message}`, { statusCode: err.statusCode });
```

### C. Logging Lifecycle Info (`logger.info`)
In [server.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/server.js) when the app starts:
```javascript
logger.info(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
```

### D. Logging Request Traffic (`logger.http`)
In [loggerMiddleware.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/middlewares/v1/loggerMiddleware.js):
```javascript
logger.http(`${req.method} ${req.originalUrl}`);
```

### E. Logging Diagnostics (`logger.debug`)
In [app.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/app.js) for auditing incoming requests and cookie diagnostics offline:
```javascript
logger.debug('--- SESSION DIAGNOSTIC ---', {
  path: req.path,
  sessionId: req.sessionID,
});
```
