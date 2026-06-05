const natsConfig = require('../config/nats');
const { JSONCodec } = require('nats');
const logger = require('../utils/logger');

const jc = JSONCodec();
const activeSubscriptions = [];

const natsSubscriber = {
  /**
   * Subscribe to a NATS subject and run the handler callback for each message
   * @param {string} subject - Subject to subscribe to
   * @param {Function} handler - Callback function taking (payload, subject)
   */
  subscribe: async (subject, handler) => {
    try {
      const nc = await natsConfig.getConnection();
      const sub = nc.subscribe(subject);
      activeSubscriptions.push(sub);
      
      logger.info(`[NATS Subscriber] Subscribed to subject "${subject}"`);
      
      // Handle the subscription stream asynchronously
      (async () => {
        for await (const m of sub) {
          try {
            const payload = jc.decode(m.data);
            logger.info(`[NATS Subscriber] Message received on subject "${subject}"`);
            await handler(payload, m.subject);
          } catch (handlerErr) {
            logger.error(`[NATS Subscriber] Error handling message on subject "${subject}": ${handlerErr.message}`);
          }
        }
      })().catch((err) => {
        logger.error(`[NATS Subscriber] Subscription stream error on subject "${subject}": ${err.message}`);
      });
      
      return sub;
    } catch (err) {
      logger.error(`[NATS Subscriber] Failed to subscribe to subject "${subject}": ${err.message}`);
      throw err;
    }
  },

  /**
   * Unsubscribe all active subscriptions cleanly
   */
  unsubscribeAll: async () => {
    logger.info('[NATS Subscriber] Unsubscribing all active subscriptions...');
    for (const sub of activeSubscriptions) {
      try {
        sub.unsubscribe();
      } catch (err) {
        logger.error(`[NATS Subscriber] Error unsubscribing: ${err.message}`);
      }
    }
    activeSubscriptions.length = 0;
  }
};

module.exports = natsSubscriber;
