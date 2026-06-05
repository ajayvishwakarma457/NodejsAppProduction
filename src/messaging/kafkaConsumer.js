const kafka = require('../config/kafka');
const logger = require('../utils/logger');

const consumers = {};

const kafkaConsumer = {
  /**
   * Initializes a consumer, joins a consumer group, subscribes to a topic, and starts listening
   * @param {string} groupId - Name of the Consumer Group
   * @param {string} topic - Topic to subscribe to
   * @param {Function} onMessage - Callback processor function
   */
  startConsumer: async (groupId, topic, onMessage) => {
    try {
      const consumer = kafka.consumer({ groupId });
      consumers[groupId] = consumer;

      logger.info(`[Kafka Consumer] Connecting group "${groupId}" to broker...`);
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: false });

      logger.info(`[Kafka Consumer] Subscribed group "${groupId}" to topic "${topic}". Ingestion active.`);

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const key = message.key ? message.key.toString() : null;
          const value = JSON.parse(message.value.toString());
          const offset = message.offset;

          logger.info(`[Kafka Consumer] Message read from topic "${topic}" [Partition: ${partition}, Offset: ${offset}, Key: ${key}]`);
          
          try {
            await onMessage(value, key, partition, offset);
          } catch (err) {
            logger.error(`[Kafka Consumer] Error processing message at partition ${partition} offset ${offset}: ${err.message}`);
            // In a production setup, we could handle error retries or redirect to DLQ topic
          }
        },
      });
    } catch (err) {
      logger.error(`[Kafka Consumer] Setup failed for group "${groupId}": ${err.message}`);
    }
  },

  /**
   * Gracefully stop consumers on shutdown
   */
  stopAll: async () => {
    for (const [groupId, consumer] of Object.entries(consumers)) {
      try {
        await consumer.disconnect();
        logger.info(`[Kafka Consumer] Stopped group "${groupId}" cleanly.`);
      } catch (err) {
        logger.error(`[Kafka Consumer] Error stopping group "${groupId}": ${err.message}`);
      }
    }
  }
};

module.exports = kafkaConsumer;
