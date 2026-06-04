# Input Validation with Zod

This document details how we configured and implemented request input validation (bodies, parameters, and query parameters) inside our Express application using the **Zod** schema validation library.

---

## 1. Why Zod?

Zod is a TypeScript-first schema declaration and validation library. In vanilla JavaScript environments, Zod provides key benefits for building production APIs:
1. **Separation of Concerns**: Validation logic is isolated in declarative schemas rather than cluttering controllers with nested `if/else` checks.
2. **Type Coercion and Transformation**: Converts inputs (e.g. converting a numeric URL string `/users/:id` like `"42"` into the number `42`) automatically during parsing.
3. **Structured Error Payloads**: Returns structured JSON arrays describing exactly which fields failed validation and why.

---

## 2. Generic Validation Middleware

To apply schemas to routes cleanly, we wrote a reusable, generic validation middleware:

```javascript
// src/middlewares/v1/validationMiddleware.js
const AppError = require('../../utils/AppError');

const validateRequest = (schema) => (req, res, next) => {
  try {
    // Validates request object properties (body, query, params) against schema
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    
    // Assign validated and parsed/transformed data back to request object
    req.body = parsed.body;
    req.query = parsed.query;
    req.params = parsed.params;
    
    next();
  } catch (error) {
    if (error.name === 'ZodError') {
      const messages = error.issues.map(err => `${err.path.slice(1).join('.')}: ${err.message}`);
      const valError = new AppError(`Validation failed: ${messages.join(', ')}`, 400);
      valError.errors = error.issues; // Attach raw Zod issues
      return next(valError);
    }
    next(error);
  }
};
```

---

## 3. Schema Definitions

Schemas describe the shape and rules of request segments:

```javascript
// src/validations/v1/userValidation.js
const { z } = require('zod');

const userIdParamSchema = z.string()
  .regex(/^\d+$/, { message: "User ID must be a numeric string" })
  .transform(Number); // Coerces String to Number

module.exports = {
  createUser: z.object({
    body: z.object({
      name: z.string().min(2, "Name must be at least 2 characters"),
      email: z.string().email("Invalid email format")
    })
  }),

  getUserById: z.object({
    params: z.object({
      id: userIdParamSchema
    })
  }),

  updateUser: z.object({
    params: z.object({
      id: userIdParamSchema
    }),
    body: z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional()
    }).refine(data => data.name || data.email, {
      message: "At least one field (name or email) must be provided for updates"
    })
  })
};
```

---

## 4. Applying Validation in Routes

We mount the generic validation middleware directly onto the routes:

```javascript
// src/routes/v1/userRoutes.js
const validateRequest = require('../../middlewares/v1/validationMiddleware');
const userValidation = require('../../validations/v1/userValidation');

// Applying body validation
router.post('/', validateRequest(userValidation.createUser), UserController.createUser);

// Applying parameters validation (Zod will automatically convert req.params.id to a Number)
router.get('/:id', validateRequest(userValidation.getUserById), UserController.getUserById);
```
