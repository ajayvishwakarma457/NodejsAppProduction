const natsConfig = require('../config/nats');
const { JSONCodec } = require('nats');
const logger = require('../utils/logger');

const jc = JSONCodec();

const natsPublisher = {
  /**
   * Publish a message to a NATS subject
   * @param {string} subject - Subject to publish to
   * @param {Object} payload - Message payload to publish
   */
  publish: async (subject, payload) => {
    try {
      const nc = await natsConfig.getConnection();
      nc.publish(subject, jc.encode(payload));
      logger.info(`[NATS Publisher] Published message to subject "${subject}"`);
    } catch (err) {
      logger.error(`[NATS Publisher] Failed to publish message to subject "${subject}": ${err.message}`);
      throw err;
    }
  }
};

module.exports = natsPublisher;
