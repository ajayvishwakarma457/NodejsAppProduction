const express = require('express');
const router = express.Router();
const passport = require('passport');
const AuthController = require('../../controllers/v1/authController');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

// Session routes
router.post('/session/login', AuthController.sessionLogin);
router.get('/session/me', AuthController.sessionMe);
router.post('/session/logout', AuthController.sessionLogout);

// OAuth2 Google routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  AuthController.googleSuccess
);

module.exports = router;
