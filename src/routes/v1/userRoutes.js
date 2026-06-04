const express = require('express');
const router = express.Router();
const UserController = require('../../controllers/v1/userController');
const validateRequest = require('../../middlewares/v1/validationMiddleware');
const userValidation = require('../../validations/v1/userValidation');
const { protect, restrictTo } = require('../../middlewares/v1/authMiddleware');

// Map CRUD routes to UserController with Zod schema validation
router.use(protect);

router.get('/', restrictTo('admin', 'moderator'), UserController.getUsers);

router.get(
  '/:id', 
  validateRequest(userValidation.getUserById), 
  UserController.getUserById
);

router.post(
  '/', 
  validateRequest(userValidation.createUser), 
  UserController.createUser
);

router.put(
  '/:id', 
  validateRequest(userValidation.updateUser), 
  UserController.updateUser
);

router.delete(
  '/:id', 
  restrictTo('admin'),
  validateRequest(userValidation.getUserById), 
  UserController.deleteUser
);

module.exports = router;
