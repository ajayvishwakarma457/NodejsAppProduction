const Redis = require('ioredis');
const logger = require('./logger');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
});

const getRegistryKey = (serviceName) => `registry:${serviceName}`;

const serviceRegistry = {
  /**
   * Registers or heartbeats a service instance
   * @param {string} serviceName - e.g. 'user-service'
   * @param {string} instanceUrl - e.g. 'http://127.0.0.1:6001'
   * @param {number} ttlSeconds - Time-to-live in seconds
   */
  registerInstance: async (serviceName, instanceUrl, ttlSeconds = 10) => {
    try {
      const key = getRegistryKey(serviceName);
      const expiration = Math.floor(Date.now() / 1000) + ttlSeconds;
      // ZADD adds the instance URL with expiration timestamp as score
      await redisClient.zadd(key, expiration, instanceUrl);
      logger.info(`[Service Registry] Registered/Heartbeated ${serviceName} instance at ${instanceUrl}`);
    } catch (err) {
      logger.error(`[Service Registry] Registration error for ${serviceName}: ${err.message}`);
    }
  },

  /**
   * Explicitly deregisters a service instance
   * @param {string} serviceName
   * @param {string} instanceUrl
   */
  deregisterInstance: async (serviceName, instanceUrl) => {
    try {
      const key = getRegistryKey(serviceName);
      await redisClient.zrem(key, instanceUrl);
      logger.info(`[Service Registry] Deregistered ${serviceName} instance at ${instanceUrl}`);
    } catch (err) {
      logger.error(`[Service Registry] Deregistration error for ${serviceName}: ${err.message}`);
    }
  },

  /**
   * Returns all active instances for a service
   * @param {string} serviceName
   * @returns {Promise<string[]>} List of active instance URLs
   */
  getInstances: async (serviceName) => {
    try {
      const key = getRegistryKey(serviceName);
      const now = Math.floor(Date.now() / 1000);
      
      // 1. Remove expired instances (score < now)
      await redisClient.zremrangebyscore(key, 0, now - 1);
      
      // 2. Fetch all valid instances (score >= now)
      const instances = await redisClient.zrangebyscore(key, now, '+inf');
      return instances;
    } catch (err) {
      logger.error(`[Service Registry] Fetch error for ${serviceName}: ${err.message}`);
      return [];
    }
  },

  /**
   * Starts a heartbeat loop for continuous registration
   * @param {string} serviceName
   * @param {string} instanceUrl
   * @param {number} intervalMs - Heartbeat interval (default 3 seconds)
   * @param {number} ttlSeconds - TTL on registry record (default 10 seconds)
   */
  startHeartbeat: (serviceName, instanceUrl, intervalMs = 3000, ttlSeconds = 10) => {
    // Register immediately on start
    serviceRegistry.registerInstance(serviceName, instanceUrl, ttlSeconds);
    
    const intervalId = setInterval(() => {
      serviceRegistry.registerInstance(serviceName, instanceUrl, ttlSeconds);
    }, intervalMs);
    
    return () => {
      clearInterval(intervalId);
    };
  }
};

module.exports = serviceRegistry;
