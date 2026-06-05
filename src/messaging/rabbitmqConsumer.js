const rabbitmq = require('../config/rabbitmq');
const logger = require('../utils/logger');

const rabbitmqConsumer = {
  /**
   * Asserts a queue, binds it to an exchange with a routing key, and consumes messages
   * @param {string} exchangeName
   * @param {string} exchangeType
   * @param {string} queueName
   * @param {string} routingKey
   * @param {Function} onMessage - Callback handler for incoming payloads
   */
  consume: async (exchangeName, exchangeType, queueName, routingKey, onMessage) => {
    try {
      const channel = await rabbitmq.getChannel();

      // Assert exchange & queue are ready
      await channel.assertExchange(exchangeName, exchangeType, { durable: true });
      await channel.assertQueue(queueName, { durable: true });

      // Bind queue to exchange with the routing key
      await channel.bindQueue(queueName, exchangeName, routingKey);
      
      logger.info(`[RabbitMQ Consumer] Bound queue "${queueName}" to exchange "${exchangeName}" via routing key "${routingKey}"`);

      await channel.consume(
        queueName,
        async (msg) => {
          if (msg !== null) {
            try {
              const content = JSON.parse(msg.content.toString());
              logger.info(`[RabbitMQ Consumer] Received event from queue "${queueName}" [Key: ${msg.fields.routingKey}]`);
              
              // Run business logic callback
              await onMessage(content, msg.fields.routingKey);
              
              // Acknowledge receipt (ACK)
              channel.ack(msg);
            } catch (err) {
              logger.error(`[RabbitMQ Consumer] Error processing message: ${err.message}`);
              // Reject and requeue message if processing failed (NACK)
              channel.nack(msg, false, true);
            }
          }
        },
        { noAck: false } // Force explicit acknowledgements
      );
    } catch (err) {
      logger.error(`[RabbitMQ Consumer] Failed to set up consumer for ${queueName}: ${err.message}`);
    }
  }
};

module.exports = rabbitmqConsumer;
