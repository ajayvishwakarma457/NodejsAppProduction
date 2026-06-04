const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const userRoutesEv = require('./userRoutesEv');
const authRoutes = require('./authRoutes');

// Mount routes to specific resource endpoints
router.use('/auth', authRoutes);
router.use('/users', userRoutes);      // Zod version
router.use('/ev-users', userRoutesEv);  // Express-validator version

module.exports = router;
