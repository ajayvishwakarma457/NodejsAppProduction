const express = require('express');
const router = express.Router();
const grpcClient = require('../../grpc/grpcClient');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

// 1. HTTP Gateway -> Unary gRPC Call
router.get('/:id', (req, res, next) => {
  const userId = req.params.id;

  grpcClient.getUser({ id: userId }, (err, response) => {
    if (err) {
      logger.error(`[gRPC Gateway] Unary getUser failed: ${err.message}`);
      return next(new AppError(err.message, err.code === 5 ? 404 : 500));
    }
    res.status(200).json({
      status: 'success',
      source: 'gRPC Unary Gateway Proxy',
      data: response,
    });
  });
});

// 2. HTTP Gateway -> Server Streaming gRPC Call (Buffered into HTTP Array response)
router.get('/:id/activities', (req, res, next) => {
  const userId = req.params.id;
  const activities = [];

  logger.info(`[gRPC Gateway] Initiating activity stream check for user: ${userId}`);
  const stream = grpcClient.streamUserActivities({ userId });

  stream.on('data', (activity) => {
    activities.push(activity);
  });

  stream.on('end', () => {
    res.status(200).json({
      status: 'success',
      source: 'gRPC Server-Streaming Gateway Proxy',
      results: activities.length,
      data: activities,
    });
  });

  stream.on('error', (err) => {
    logger.error(`[gRPC Gateway] Server stream error: ${err.message}`);
    next(new AppError(`Server stream failed: ${err.message}`, 500));
  });
});

// 3. HTTP Gateway -> Client Streaming gRPC Call
router.post('/upload-logs', (req, res, next) => {
  const { logs } = req.body; // Expect array of logs: [{ action: 'X' }]

  if (!logs || !Array.isArray(logs)) {
    return next(new AppError('Payload must contain a "logs" array', 400));
  }

  // Invoke client streaming RPC call
  const call = grpcClient.uploadAuditLogs((err, response) => {
    if (err) {
      logger.error(`[gRPC Gateway] Client stream upload failed: ${err.message}`);
      return next(new AppError(err.message, 500));
    }
    res.status(200).json({
      status: 'success',
      source: 'gRPC Client-Streaming Gateway Proxy',
      data: response,
    });
  });

  // Stream each audit log payload to the server
  logs.forEach((log) => {
    call.write({
      userId: log.userId || 'system',
      action: log.action || 'GENERIC_ACTION',
      timestamp: log.timestamp || new Date().toISOString(),
    });
  });

  // End the client stream to obtain server response
  call.end();
});

module.exports = router;
