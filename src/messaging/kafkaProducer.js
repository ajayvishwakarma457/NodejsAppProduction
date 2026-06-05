const kafka = require('../config/kafka');
const logger = require('../utils/logger');

const producer = kafka.producer();
let isConnected = false;

const kafkaProducer = {
  /**
   * Connects the producer to the Kafka broker
   */
  connect: async () => {
    if (isConnected) return;
    try {
      await producer.connect();
      isConnected = true;
      logger.info('[Kafka Producer] Connected successfully.');
    } catch (err) {
      logger.error(`[Kafka Producer] Connection failed: ${err.message}`);
    }
  },

  /**
   * Disconnects the producer
   */
  disconnect: async () => {
    if (!isConnected) return;
    try {
      await producer.disconnect();
      isConnected = false;
      logger.info('[Kafka Producer] Disconnected successfully.');
    } catch (err) {
      logger.error(`[Kafka Producer] Disconnection error: ${err.message}`);
    }
  },

  /**
   * Sends a message to a Kafka topic
   * @param {string} topic - Target Kafka topic
   * @param {string} key - Partition routing key (guarantees partition order matching this key)
   * @param {Object} payload - Message payload
   */
  publish: async (topic, key, payload) => {
    try {
      if (!isConnected) {
        await kafkaProducer.connect();
      }

      const record = {
        key: key ? String(key) : null,
        value: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
        }),
      };

      const result = await producer.send({
        topic,
        messages: [record],
      });

      logger.info(`[Kafka Producer] Message published to topic "${topic}" [Partition: ${result[0].partition}, Offset: ${result[0].baseOffset}]`);
      return result;
    } catch (err) {
      logger.error(`[Kafka Producer] Failed to send message: ${err.message}`);
      throw err;
    }
  }
};

module.exports = kafkaProducer;
