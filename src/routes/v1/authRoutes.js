const express = require('express');
const router = express.Router();
const AuthController = require('../../controllers/v1/authController');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

module.exports = router;
