const express = require('express');
const router = express.Router();
const UserController = require('../../controllers/v1/userController');
const userExpressValidator = require('../../validations/v1/userExpressValidator');
const expressValidatorHandler = require('../../middlewares/v1/expressValidatorHandler');

// Map CRUD routes to UserController with express-validator middleware
router.get('/', UserController.getUsers);

router.get(
  '/:id',
  userExpressValidator.validateId,
  expressValidatorHandler,
  UserController.getUserById
);

router.post(
  '/',
  userExpressValidator.createUser,
  expressValidatorHandler,
  UserController.createUser
);

router.put(
  '/:id',
  userExpressValidator.updateUser,
  expressValidatorHandler,
  UserController.updateUser
);

router.delete(
  '/:id',
  userExpressValidator.validateId,
  expressValidatorHandler,
  UserController.deleteUser
);

module.exports = router;
