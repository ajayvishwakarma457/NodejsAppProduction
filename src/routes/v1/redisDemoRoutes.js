const express = require('express');
const RedisDemoController = require('../../controllers/v1/redisDemoController');
const { authenticate } = require('../../middlewares/v1/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// String routes
router.post('/string', RedisDemoController.setString);
router.get('/string/:key', RedisDemoController.getString);

// Hash routes
router.post('/hash', RedisDemoController.setHash);
router.get('/hash/:key', RedisDemoController.getHash);

// Sorted Set (Leaderboard) routes
router.post('/leaderboard', RedisDemoController.addToLeaderboard);
router.get('/leaderboard', RedisDemoController.getLeaderboard);

module.exports = router;
