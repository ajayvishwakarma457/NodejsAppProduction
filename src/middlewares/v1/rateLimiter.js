const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');

// Initialize Redis client
const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true, // Queue commands when connection is down
});

redisClient.on('error', (err) => {
  console.error('Redis Rate Limiting client error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis client successfully connected for Rate Limiting');
});

// Configure Redis stores
const globalStore = new RedisStore({
  sendCommand: (...args) => redisClient.call(...args),
  prefix: 'rate_limit_global:',
});

const authStore = new RedisStore({
  sendCommand: (...args) => redisClient.call(...args),
  prefix: 'rate_limit_auth:',
});

// Global rate limiter middleware
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per 15-minute window
  standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: globalStore,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  statusCode: 429 // Too Many Requests
});

// Strict rate limiter middleware for sensitive endpoints (e.g. Auth routes)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 requests per 15-minute window for auth
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: authStore,
  message: {
    status: 'fail',
    message: 'Too many login attempts/auth requests, please try again after 15 minutes.'
  },
  statusCode: 429
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  redisClient
};
