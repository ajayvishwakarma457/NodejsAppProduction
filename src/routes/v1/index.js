const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');

// Mount routes to specific resource resource endpoints
router.use('/users', userRoutes);

module.exports = router;
