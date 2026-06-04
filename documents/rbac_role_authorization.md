# Role-Based Access Control (RBAC) & Authorization

This document describes the implementation of Role-Based Access Control (RBAC) to enforce security restrictions based on user roles (e.g. `user`, `moderator`, `admin`).

---

## 1. Role Field Setup in Database

We updated [src/models/userModel.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/models/userModel.js) to include the `role` property as an enum field.

```javascript
role: {
  type: String,
  enum: ['user', 'moderator', 'admin'],
  default: 'user',
}
```

---

## 2. Restrict To Middleware

The `restrictTo` authorization middleware is implemented in [src/middlewares/v1/authMiddleware.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/middlewares/v1/authMiddleware.js).

```javascript
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user is attached by protect middleware
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403)); // Forbidden
    }
    next();
  };
};
```

---

## 3. Applying RBAC to Endpoints

In [src/routes/v1/userRoutes.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/routes/v1/userRoutes.js), we guard sensitive endpoints by combining `protect` with `restrictTo`:

```javascript
const { protect, restrictTo } = require('../../middlewares/v1/authMiddleware');

router.use(protect);

// Only admins and moderators can retrieve the full user list
router.get('/', restrictTo('admin', 'moderator'), UserController.getUsers);

// Only admins can delete a user account
router.delete('/:id', restrictTo('admin'), validateRequest(userValidation.getUserById), UserController.deleteUser);
```

---

## 4. API Request Verification

### Accessing Admin Route (With default `user` Role)
* **API call**: `GET /api/v1/users`
* **Response**: `403 Forbidden`
* **Response Body**:
  ```json
  {
    "status": "fail",
    "message": "You do not have permission to perform this action"
  }
  ```
