const { redisClient } = require('./rateLimiter');
const logger = require('../../utils/logger');

/**
 * Idempotency Key Middleware
 * Ensures safe retries on non-idempotent actions (like POST, PUT, PATCH).
 * Saves completed transaction payloads in Redis and returns them immediately on repeated keys.
 */
const idempotencyMiddleware = async (req, res, next) => {
  // Only apply to mutate requests (POST, PUT, PATCH, DELETE)
  const isMutateRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!isMutateRequest) {
    return next();
  }

  // Retrieve idempotency header (case-insensitive)
  const key = req.headers['idempotency-key'];
  if (!key) {
    return next();
  }

  const redisKey = `idempotency:${key}`;

  try {
    // 1. Check if the key exists in Redis cache
    const cachedResponse = await redisClient.get(redisKey);
    if (cachedResponse) {
      const { status, body, headers } = JSON.parse(cachedResponse);
      logger.info(`[Idempotency] Cache HIT for key: ${key}. Returning cached response.`);

      // Re-apply headers if necessary
      if (headers) {
        Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
      }
      res.setHeader('X-Cache-Idempotency', 'HIT');
      
      // Parse body if it is a JSON string
      try {
        return res.status(status).json(JSON.parse(body));
      } catch {
        return res.status(status).send(body);
      }
    }

    logger.info(`[Idempotency] Cache MISS for key: ${key}. Intercepting response.`);
    res.setHeader('X-Cache-Idempotency', 'MISS');

    // 2. Intercept res.send/res.json to cache the successful response
    const originalSend = res.send;

    res.send = function (body) {
      // Restore the original send function to avoid recursion
      res.send = originalSend;

      // Only cache successful or client-error responses (exclude 5xx server bugs)
      if (res.statusCode >= 200 && res.statusCode < 500) {
        const payloadToCache = JSON.stringify({
          status: res.statusCode,
          headers: res.getHeaders(),
          body: typeof body === 'string' ? body : JSON.stringify(body),
        });

        // Cache response in Redis with 24-hour TTL (86400 seconds)
        redisClient.set(redisKey, payloadToCache, 'EX', 86400)
          .then(() => logger.info(`[Idempotency] Response cached successfully for key: ${key}`))
          .catch((err) => logger.error(`[Idempotency] Failed to cache response: ${err.message}`));
      }

      return res.send(body);
    };

    next();
  } catch (err) {
    logger.error(`[Idempotency] Redis error during key check: ${err.message}`);
    next(); // Fail-open to avoid locking endpoints if Redis drops
  }
};

module.exports = idempotencyMiddleware;
