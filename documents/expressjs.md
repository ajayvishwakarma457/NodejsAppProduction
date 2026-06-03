# Express.js Reference Guide

This document describes how Express.js is structured in our production project, detailing Routing, Middleware, Request/Response handling, and the Model-View-Controller (MVC) architecture.

---

## 1. MVC Project Structure

To maintain separation of concerns and keep code modular as the project grows, we use the industry-standard Model-View-Controller (MVC) structure:

```text
├── public/                  # Static Files (Views/Frontend assets)
│   └── index.html
├── src/
│   ├── controllers/         # Handles request logic & constructs responses
│   │   └── userController.js
│   ├── middlewares/         # Global & route-level middleware functions
│   │   ├── errorMiddleware.js
│   │   └── loggerMiddleware.js
│   ├── models/              # Handles database schema & data access layer
│   │   └── userModel.js
│   ├── routes/              # Directs requests to the correct controller
│   │   └── userRoutes.js
│   ├── app.js               # Binds express settings, middlewares, and routes
│   └── server.js            # Entry point: loads config and spins up HTTP server
├── .env                     # Local Environment variables
└── package.json             # NPM dependencies & run scripts
```

---

## 2. Routing (GET, POST, PUT, DELETE)

Routes map URLs to controller actions. We organize routes using `express.Router()`.

```javascript
// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');

router.get('/', UserController.getUsers);         // GET all users
router.get('/:id', UserController.getUserById);   // GET user by ID
router.post('/', UserController.createUser);       // POST create user
router.put('/:id', UserController.updateUser);     // PUT update user
router.delete('/:id', UserController.deleteUser);  // DELETE user

module.exports = router;
```

---

## 3. Middleware Architecture

Middleware functions are functions that have access to the request object (`req`), the response object (`res`), and the next middleware function in the application’s request-response cycle (`next`).

We implement three types of middleware:

### A. Global Middleware
Applies to all routes in the application. E.g., built-in body parsers and request loggers.
```javascript
app.use(express.json()); // Parses application/json body
app.use(loggerMiddleware); // Custom request logger
```

### B. Route-Level Middleware
Applies only to specific endpoints (e.g. input validation, authentication).
```javascript
// Validate numeric ID before hitting controller
const validateId = (req, res, next) => {
  if (isNaN(parseInt(req.params.id, 10))) {
    const err = new Error("ID must be a number");
    err.status = 400;
    return next(err); // Pass error to handler
  }
  next(); // Success: move to controller
};
router.get('/:id', validateId, UserController.getUserById);
```

### C. Centralized Error-Handling Middleware
Express identifies error-handling middleware by its **four** arguments: `(err, req, res, next)`. Any error passed via `next(err)` in controllers or route middlewares will bubble down to this function.
```javascript
// src/middlewares/errorMiddleware.js
const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: {
      status: statusCode,
      message: err.message || "Internal Server Error"
    }
  });
};
```

---

## 4. Request and Response Handling

### Request Properties:
* **`req.params`**: Used to extract route parameters (e.g., dynamic segment `:id` -> `req.params.id`).
* **`req.query`**: Used to extract URL query string parameters (e.g., `?name=Alice` -> `req.query.name`).
* **`req.body`**: Holds key-value pairs of data submitted in the request body. Populated by parsing middlewares like `express.json()`.

### Response Properties:
* **`res.status(code)`**: Sets the HTTP response status.
* **`res.json(data)`**: Serializes `data` to a JSON string and sets `Content-Type: application/json`.
* **`res.status(204).end()`**: Sends a success status with no response body.

---

## 5. Static Files Serving

Static assets (HTML, CSS, JS, images) can be served using the built-in `express.static` middleware.
```javascript
// Serves files from public/ directory at the root URL path (/)
app.use(express.static(path.join(__dirname, '..', 'public')));
```
