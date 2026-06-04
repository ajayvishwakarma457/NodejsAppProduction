const express = require('express');
const router = express.Router();
const UserController = require('../../controllers/v1/userController');
const validateRequest = require('../../middlewares/v1/validationMiddleware');
const userValidation = require('../../validations/v1/userValidation');
const { authenticate, restrictTo } = require('../../middlewares/v1/authMiddleware');

// Map CRUD routes to UserController with Zod schema validation
router.use(authenticate);

router.get('/search', UserController.searchUsers);
router.get('/search/explain', UserController.explainSearch);
router.get('/stats', restrictTo('admin'), UserController.getUserStats);

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
