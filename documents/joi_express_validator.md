# Request Validation: Joi vs. Express-Validator

This document details how we configured and implemented request validation in Express using **express-validator**, and compares it with **Joi** and **Zod**.

---

## 1. Overview of Libraries

In Node.js, there are three primary validation ecosystems:
1. **Zod**: TypeScript-first, parses and transforms values (our default standard).
2. **Joi**: Object schema description language and validator. Extremely feature-rich and traditional in JavaScript.
3. **express-validator**: Built on top of `validator.js`. It integrates directly as Express route-level middleware, extracting and sanitizing values in a single pass.

---

## 2. express-validator Implementation

`express-validator` allows you to chain validations directly onto route handlers.

### A. Validation Schemas (`src/validations/v1/userExpressValidator.js`)
We define arrays of validation chains checking specific inputs (e.g. `body`, `param`, or `query`):

```javascript
const { body, param } = require('express-validator');

module.exports = {
  createUser: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail() // Sanitizes email to lower case/standard format
  ],
  validateId: [
    param('id')
      .trim()
      .isInt().withMessage('User ID must be an integer')
      .toInt() // Coerces String to Number
  ]
};
```

### B. Validation Result Handler Middleware
To prevent duplicating error-checking logic inside routers, we created a single middleware that catches validation issues and bubbles them to our centralized error handler:

```javascript
// src/middlewares/v1/expressValidatorHandler.js
const { validationResult } = require('express-validator');
const AppError = require('../../utils/AppError');

const expressValidatorHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(err => `${err.path}: ${err.msg}`);
    const valError = new AppError(`Validation failed: ${messages.join(', ')}`, 400);
    valError.errors = errors.array(); // Attach raw issues
    return next(valError);
  }
  next();
};
```

### C. Mounting express-validator Routes
The validations run in sequence before hitting the controller:

```javascript
// src/routes/v1/userRoutesEv.js
const userExpressValidator = require('../../validations/v1/userExpressValidator');
const expressValidatorHandler = require('../../middlewares/v1/expressValidatorHandler');

router.post(
  '/',
  userExpressValidator.createUser,
  expressValidatorHandler,
  UserController.createUser
);
```

---

## 3. Comparison: Zod vs. Joi vs. Express-Validator

| Feature | **Zod** | **Joi** | **Express-Validator** |
|---|---|---|---|
| **Ecosystem integration** | Standalone schema validator | Standalone schema validator | Tied directly to Express routes |
| **TypeScript Type Inference** | **Excellent** (Built-in) | Harder (requires extra wrappers) | Weak |
| **Sanitization (mutating values)** | Supports transforms | Supports transforms | **Excellent** (Sanitizers like `.trim()`, `.normalizeEmail()`) |
| **Syntax** | Functional & composable | Fluent method chaining | String-path declarations |
| **Performance** | Fast | Moderate | Fast |
