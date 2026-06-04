# Advanced Express.js: Full-Layer Versioning & Centralized Error Handling

This document details how we organized our backend codebase using **Full-Layer Versioning (Pattern 2)** and built an advanced, environment-specific centralized error-handling system in Express.

---

## 1. Full-Layer Versioning (Pattern 2)

For maximum isolation and modularity, we use **Full-Layer Versioning**. This ensures that different API versions have completely isolated routes, controllers, and middlewares. Under this setup, a change to `/api/v2` can never accidentally break `/api/v1`.

### Directory Structure
```text
src/
├── controllers/
│   └── v1/
│       └── userController.js # Versioned controller logic
├── middlewares/
│   └── v1/
│       ├── errorMiddleware.js
│       └── loggerMiddleware.js
├── models/
│   └── userModel.js          # DB Models (unversioned, mapped to active schema)
├── routes/
│   └── v1/
│       ├── index.js          # Aggregates and mounts all v1 resources
│       └── userRoutes.js     # Versioned user routes
├── utils/
│   └── AppError.js           # Shared utilities
├── app.js                    # Core App entry (mounts routers & global middlewares)
└── server.js                 # Network setup & listeners
```

### Route & Middleware Aggregation
Middlewares and routes are bound in a modular hierarchy, imported from their respective version subfolders:

```javascript
// src/app.js
const loggerMiddleware = require('./middlewares/v1/loggerMiddleware');
const errorMiddleware = require('./middlewares/v1/errorMiddleware');
const v1Router = require('./routes/v1');

// Mount routes to API namespace
app.use('/api/v1', v1Router);
```

V1 Routing points directly to V1 Controllers:
```javascript
// src/routes/v1/userRoutes.js
const UserController = require('../../controllers/v1/userController');
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
Leaking stack traces or details of internal databases in production is a major security vulnerability. 

Our centralized error handler formats output differently based on `process.env.NODE_ENV`:

```javascript
// src/middlewares/v1/errorMiddleware.js
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
