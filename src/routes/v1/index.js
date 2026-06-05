const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const userRoutesEv = require('./userRoutesEv');
const cqrsUserRoutes = require('./cqrsUserRoutes');
const diUserRoutes = require('./diUserRoutes');
const hexUserRoutes = require('./hexUserRoutes');
const grpcGatewayRoutes = require('./grpcGatewayRoutes');
const authRoutes = require('./authRoutes');
const apiKeyRoutes = require('./apiKeyRoutes');
const transactionRoutes = require('./transactionRoutes');
const redisDemoRoutes = require('./redisDemoRoutes');
const uploadRoutes = require('./uploadRoutes');
const jobRoutes = require('./jobRoutes');
const sseRoutes = require('./sseRoutes');
const featureFlagDemoRoutes = require('./featureFlagDemoRoutes');

// Mount routes to specific resource endpoints
router.use('/auth', authRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/users', userRoutes);      // Zod version
router.use('/ev-users', userRoutesEv);  // Express-validator version
router.use('/cqrs-users', cqrsUserRoutes); // CQRS / Event-Sourced version
router.use('/di-users', diUserRoutes);     // Dependency Injection version
router.use('/hex-users', hexUserRoutes);   // Hexagonal (Ports & Adapters) version
router.use('/grpc-users', grpcGatewayRoutes); // REST-gRPC Gateway proxy
router.use('/transactions', transactionRoutes);
router.use('/redis-demo', redisDemoRoutes);
router.use('/uploads', uploadRoutes);
router.use('/jobs', jobRoutes);
router.use('/sse', sseRoutes);
router.use('/feature-flags', featureFlagDemoRoutes);

module.exports = router;
