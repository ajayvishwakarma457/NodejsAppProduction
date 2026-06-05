# Morgan — HTTP Request Logging

This document describes the design, configuration, and implementation of **Morgan HTTP request logging** integrated with Winston in our production Node.js application.

---

## 1. Why Morgan?

While Winston is a generic logging framework, **Morgan** is an Express-specific middleware designed to intercept HTTP transactions. It automatically parses HTTP tokens such as:
* HTTP verbs (`:method`)
* Target paths (`:url`)
* Response statuses (`:status`)
* Round-trip response latencies (`:response-time ms`)
* Content header lengths (`:res[content-length]`)
* Source user agents (`:user-agent`)
* Source client IP addresses (`:remote-addr`)

By coupling **Morgan** directly to **Winston**, we route HTTP-specific details through Winston's transports. This ensures all logs conform to a single output standard (pretty console logs in development; single-line JSON logs in production).

---

## 2. Configuration (`src/middlewares/v1/loggerMiddleware.js`)

We modified our HTTP logging middleware to use Morgan and dynamically format strings depending on the active environment:

```javascript
const morgan = require('morgan');
const logger = require('../../utils/logger');

// Define format string for production (JSON structure)
const morganFormatProd = (tokens, req, res) => {
  return JSON.stringify({
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    responseTime: `${tokens['response-time'](req, res)} ms`,
    contentLength: tokens.res(req, res, 'content-length'),
    userAgent: tokens['user-agent'](req, res),
    remoteAddress: tokens['remote-addr'](req, res),
  });
};

// Define format for development (simple dev style string)
const morganFormatDev = ':method :url :status :response-time ms - :res[content-length]';

// Configure the stream connection to Winston
const stream = {
  write: (message) => {
    // Morgan appends a newline character to the end of every message, so we trim it
    logger.http(message.trim());
  },
};

// Select format based on environment
const format = process.env.NODE_ENV === 'production' ? morganFormatProd : morganFormatDev;

// Build the Morgan middleware
const loggerMiddleware = morgan(format, { stream });

module.exports = loggerMiddleware;
```

---

## 3. Integration in Express Application

The middleware is mounted globally in [app.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/app.js) before routes and static files:

```javascript
const loggerMiddleware = require('./middlewares/v1/loggerMiddleware');

// Custom logging middleware using Morgan + Winston stream
app.use(loggerMiddleware);
```

---

## 4. Visual Verification

When a client queries the endpoints in development mode, logs are printed neatly in the console stream with colors:

```bash
[2026-06-05 14:31:52:315] [http]: GET /api/v1/users 200 1.683 ms - 101
```

In production mode, the stream writes structured JSON lines to both stdout and `/logs/combined.log`:

```json
{"method":"GET","url":"/api/v1/users","status":200,"responseTime":"1.683 ms","contentLength":"101","userAgent":"Mozilla/5.0...","remoteAddress":"::1","level":"http","message":"{...}","timestamp":"2026-06-05T09:01:52.315Z"}
```
