# Winston — Structured JSON Logging

This document outlines the implementation details and design architecture of structured logging in our production Node.js application using **Winston**.

---

## 1. Why Winston & Structured JSON Logging?

In production, simple console statements (`console.log`, `console.error`) are insufficient because:
* **No Metadata**: They lack structured metadata (e.g. log level, timestamp, environment context).
* **Hard to Query**: Multi-line trace messages are outputted separately, making it extremely difficult for log aggregators (e.g. Datadog, ELK Stack, AWS CloudWatch, Loki) to group and search logs.
* **Winston** is the industry standard structured logging library for Node.js. It standardizes log levels, handles multi-channel output streams (Console, Files, third-party log services), and structures output log items as single-line JSON objects containing timestamps, trace tags, and stacks.

---

## 2. Logger Configuration (`src/utils/logger.js`)

We implemented the logger to automatically toggle formats depending on the active environment (`NODE_ENV`):

1. **Development Environment**: Pretty-printed, colorized, human-readable line layouts.
2. **Production Environment**: Standardized, single-line structured JSON logs with call stacks attached on exceptions.

The configuration file is located at [logger.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/utils/logger.js):

```javascript
const winston = require('winston');
const path = require('path');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level}]: ${info.message}${info.stack ? `\nStack: ${info.stack}` : ''}`
  )
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }), // capture trace stack
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format: winston.format.combine(
    process.env.NODE_ENV === 'production' ? prodFormat : devFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: prodFormat,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      format: prodFormat,
    }),
  ],
});

module.exports = logger;
```

---

## 3. Middleware Integrations

### HTTP Request Logging
Refactored [loggerMiddleware.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/middlewares/v1/loggerMiddleware.js) to utilize Winston's `http` channel:

```javascript
const logger = require('../../utils/logger');

const loggerMiddleware = (req, res, next) => {
  logger.http(`${req.method} ${req.originalUrl}`);
  next();
};
```

### Centralized Exception Handling
Integrated structured logger inside [errorMiddleware.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/middlewares/v1/errorMiddleware.js):
* Log trusted user validations or operational mistakes at the `warn` level.
* Log unhandled exceptions and server bugs at the `error` level to write trace logs to `logs/error.log`.

```javascript
const logger = require('../../utils/logger');

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    logger.warn(`Operational Warning: ${err.message}`, { statusCode: err.statusCode });
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    logger.error('Unhandled System Exception:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }
};
```
