const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const userRoutesEv = require('./userRoutesEv');
const authRoutes = require('./authRoutes');
const apiKeyRoutes = require('./apiKeyRoutes');
const transactionRoutes = require('./transactionRoutes');
const redisDemoRoutes = require('./redisDemoRoutes');

// Mount routes to specific resource endpoints
router.use('/auth', authRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/users', userRoutes);      // Zod version
router.use('/ev-users', userRoutesEv);  // Express-validator version
router.use('/transactions', transactionRoutes);
router.use('/redis-demo', redisDemoRoutes);

module.exports = router;
