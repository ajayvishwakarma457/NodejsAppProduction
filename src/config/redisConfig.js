const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Recommended for background workers (e.g. BullMQ)
  enableOfflineQueue: true,
  connectTimeout: 10000, // Fail fast on slow connections (10 seconds)
  keepAlive: 30000, // TCP KeepAlive packet ping interval (30 seconds)
  reconnectOnError: (err) => {
    if (err.message.includes('READONLY')) {
      return true; // Auto-reconnect if server switches to read-only replica
    }
    return false;
  }
};

module.exports = redisConfig;
