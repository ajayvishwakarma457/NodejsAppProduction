const express = require('express');
const router = express.Router();
const UserController = require('../../controllers/v1/userController');
const AppError = require('../../utils/AppError');

// Route-level middleware to validate ID
const validateId = (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    // Pass validation error to next middleware
    return next(new AppError("Invalid User ID. Must be a numeric value.", 400));
  }
  next();
};

// Map CRUD routes to UserController
router.get('/', UserController.getUsers);
router.get('/:id', validateId, UserController.getUserById);
router.post('/', UserController.createUser);
router.put('/:id', validateId, UserController.updateUser);
router.delete('/:id', validateId, UserController.deleteUser);

module.exports = router;
