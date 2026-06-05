const rabbitmq = require('../config/rabbitmq');
const logger = require('../utils/logger');

const rabbitmqProducer = {
  /**
   * Publishes a message to a RabbitMQ Exchange with a routing key
   * @param {string} exchangeName - Name of the target Exchange
   * @param {string} exchangeType - e.g. 'direct', 'fanout', 'topic'
   * @param {string} routingKey - Routing key bind identifier
   * @param {Object} message - Payload to send
   */
  publish: async (exchangeName, exchangeType, routingKey, message) => {
    try {
      const channel = await rabbitmq.getChannel();
      
      // Assert the exchange exists
      await channel.assertExchange(exchangeName, exchangeType, { durable: true });
      
      const payload = Buffer.from(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
      }));

      const published = channel.publish(exchangeName, routingKey, payload, {
        persistent: true, // Persist messages to disk to survive RabbitMQ crashes
      });

      if (published) {
        logger.info(`[RabbitMQ Producer] Published message to exchange "${exchangeName}" [Type: ${exchangeType}] using key "${routingKey}"`);
      } else {
        logger.warn(`[RabbitMQ Producer] Message was buffered internally by RabbitMQ client.`);
      }
    } catch (err) {
      logger.error(`[RabbitMQ Producer] Failed to publish message: ${err.message}`);
    }
  }
};

module.exports = rabbitmqProducer;
