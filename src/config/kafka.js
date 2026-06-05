const { Kafka, logLevel } = require('kafkajs');
const logger = require('../utils/logger');

const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'production-platform';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

// Instantiate the core Kafka client
const kafka = new Kafka({
  clientId: KAFKA_CLIENT_ID,
  brokers: KAFKA_BROKERS,
  logCreator: () => {
    return (logEntry) => {
      // Guard against malformed entries from OTel instrumentation wrapping
      const entry = logEntry?.entry ?? logEntry ?? {};
      const level = entry?.level;
      const log = entry?.log ?? {};
      const message = `${log?.message ?? entry?.message ?? ''} ${JSON.stringify(log)}`;

      if (!level) return; // skip if no valid log level

      if (level === logLevel.ERROR) {
        logger.error(`[KafkaJS] ERROR: ${message}`);
      } else if (level === logLevel.WARN) {
        logger.warn(`[KafkaJS] WARN: ${message}`);
      } else {
        logger.debug(`[KafkaJS] INFO: ${message}`);
      }
    };
  }
});

module.exports = kafka;
