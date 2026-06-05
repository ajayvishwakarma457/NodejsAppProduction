'use strict';

const express = require('express');
const diUserController = require('../../controllers/v1/diUserController');
const router = express.Router();

router.route('/')
  .get(diUserController.getUsers)
  .post(diUserController.createUser);

router.route('/:id')
  .get(diUserController.getUserById);

module.exports = router;
