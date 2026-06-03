const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');

// Route-level middleware example: validate numeric ID
const validateId = (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    const error = new Error("Invalid User ID. Must be a number.");
    error.status = 400;
    return next(error);
  }
  next();
};

// GET all users
router.get('/', UserController.getUsers);

// GET user by ID (with route-level middleware)
router.get('/:id', validateId, UserController.getUserById);

// POST create user
router.post('/', UserController.createUser);

// PUT update user
router.put('/:id', validateId, UserController.updateUser);

// DELETE user
router.delete('/:id', validateId, UserController.deleteUser);

module.exports = router;
