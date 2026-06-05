const amqp = require('amqplib');
const logger = require('../utils/logger');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

let connection = null;
let channel = null;

const rabbitmq = {
  /**
   * Connects to RabbitMQ and establishes connection and channel
   */
  connect: async () => {
    if (connection && channel) {
      return { connection, channel };
    }
    
    try {
      logger.info(`[RabbitMQ] Connecting to RabbitMQ at ${RABBITMQ_URL}...`);
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      
      connection.on('error', (err) => {
        logger.error(`[RabbitMQ] Connection error: ${err.message}`);
        connection = null;
        channel = null;
      });

      connection.on('close', () => {
        logger.warn('[RabbitMQ] Connection closed. Attempting reconnect details...');
        connection = null;
        channel = null;
      });

      logger.info('[RabbitMQ] Connection & channel established successfully.');
      return { connection, channel };
    } catch (err) {
      logger.error(`[RabbitMQ] Connection failed: ${err.message}`);
      throw err;
    }
  },

  /**
   * Retrieve active channel, connecting if necessary
   */
  getChannel: async () => {
    if (!channel) {
      const conn = await rabbitmq.connect();
      return conn.channel;
    }
    return channel;
  },

  /**
   * Gracefully close connection
   */
  close: async () => {
    try {
      if (channel) {
        await channel.close();
      }
      if (connection) {
        await connection.close();
      }
      logger.info('[RabbitMQ] Connection closed gracefully.');
    } catch (err) {
      logger.error(`[RabbitMQ] Error during close: ${err.message}`);
    } finally {
      connection = null;
      channel = null;
    }
  }
};

module.exports = rabbitmq;
