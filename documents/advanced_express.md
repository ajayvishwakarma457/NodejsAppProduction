# Advanced Express.js: Route Organization, Versioning & Centralized Error Handling

This document details how we organized routes using versioning (`/api/v1`) and built an advanced, environment-specific centralized error-handling system in Express.

---

## 1. Professional Route Organization & Versioning

API versioning is critical for production environments. It ensures that changes (like changing database models or response structures) do not break older mobile apps or third-party clients currently using the API.

### Directory Structure
```text
src/
├── routes/
│   ├── v1/
│   │   ├── index.js          # Aggregates and mounts all v1 resources
│   │   └── userRoutes.js     # User resource routes
```

### Route Aggregation Pattern
By grouping route endpoints under a specific version router, we can easily mount versions cleanly in `src/app.js`:

```javascript
// src/app.js
const v1Router = require('./routes/v1');
app.use('/api/v1', v1Router);
```

All user resource endpoints are mounted under `/api/v1/users` inside the `v1` group:
```javascript
// src/routes/v1/index.js
const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');

router.use('/users', userRoutes);

module.exports = router;
```

---

## 2. Advanced Centralized Error Handling

In Express, any middleware with four arguments `(err, req, res, next)` is treated as an error handler.

To prevent duplicated code, controllers and validation middlewares do not build error HTTP responses. Instead, they catch errors (or create them) and pass them down using the `next(err)` function.

### A. Custom Operational Error Class (`AppError`)
System bugs (like database connection issues or syntax errors) are unexpected. However, client mistakes (like validation failures or querying non-existent IDs) are **operational errors**. 

We use a custom `AppError` class extending `Error` to identify these:
```javascript
// src/utils/AppError.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Identifies expected client errors

    Error.captureStackTrace(this, this.constructor);
  }
}
```

### B. Environment-Specific Error Responses
Leaking stack traces or details of internal databases (like MongoDB query structure) in production is a major security vulnerability. 

Our centralized error handler formats output differently based on `process.env.NODE_ENV`:

```javascript
// src/middlewares/errorMiddleware.js
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack // Help debug in development
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    // Known operational error: send message to client
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // Programming error or unknown bug: hide details
    console.error('ERROR 💥:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }
};
```
