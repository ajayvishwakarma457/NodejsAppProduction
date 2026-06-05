'use strict';

const express = require('express');
const hexUserController = require('../../controllers/v1/hexUserController');
const router = express.Router();

router.route('/')
  .get(hexUserController.getUsers)
  .post(hexUserController.createUser);

router.route('/:id')
  .get(hexUserController.getUserById);

module.exports = router;
