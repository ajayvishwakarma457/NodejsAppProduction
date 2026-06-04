const Redis = require('ioredis');
const { redisClient } = require('../middlewares/v1/rateLimiter');

// Create a dedicated Redis client for subscription (as subscriber clients cannot run normal commands)
const subRedisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
});

const CHANNEL_NAME = 'cache:invalidate';

const PubSubInvalidator = {
  // Initialize the Pub/Sub listener
  initListener: () => {
    const doSubscribe = () => {
      subRedisClient.subscribe(CHANNEL_NAME, (err, count) => {
        if (err) {
          console.error('❌ Failed to subscribe to invalidation channel:', err);
        } else {
          console.log(`📡 Subscribed to cache invalidation channel: "${CHANNEL_NAME}" (sub count: ${count})`);
        }
      });
    };

    if (subRedisClient.status === 'ready') {
      doSubscribe();
    } else {
      subRedisClient.once('ready', doSubscribe);
    }

    subRedisClient.on('message', async (channel, message) => {
      if (channel === CHANNEL_NAME) {
        console.log(`🔔 [Pub/Sub Invalidation] Broadcast received to invalidate key: "${message}"`);
        
        // Physically delete from the main Redis database
        await redisClient.del(message);
        console.log(`🧹 [Pub/Sub Invalidation] Deleted key "${message}" from Redis.`);
      }
    });
  },

  // Publish invalidation event
  publishInvalidation: async (key) => {
    try {
      console.log(`📣 [Pub/Sub Invalidation] Publishing invalidation for key: "${key}"`);
      await redisClient.publish(CHANNEL_NAME, key);
    } catch (err) {
      console.error('❌ Failed to publish invalidation event:', err);
    }
  },
};

module.exports = PubSubInvalidator;
