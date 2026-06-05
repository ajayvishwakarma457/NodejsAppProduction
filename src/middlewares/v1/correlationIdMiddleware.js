const crypto = require('crypto');
const asyncLocalStorage = require('../../utils/tracer');

/**
 * Correlation ID Middleware
 * Intercepts incoming requests, sets X-Correlation-ID headers,
 * and tracks the transaction utilizing AsyncLocalStorage.
 */
const correlationIdMiddleware = (req, res, next) => {
  // Read existing correlation ID if forwarded by client/gateway, or generate a fresh UUID
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();

  // Expose it to the requester
  res.setHeader('X-Correlation-ID', correlationId);
  req.correlationId = correlationId;

  // Run subsequent middleware and route executions within the ALS store context
  asyncLocalStorage.run({ correlationId }, () => {
    next();
  });
};

module.exports = correlationIdMiddleware;
