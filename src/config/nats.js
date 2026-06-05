const { connect } = require('nats');
const logger = require('../utils/logger');

const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';

let connection = null;

const natsConfig = {
  /**
   * Connect to NATS server
   */
  connect: async () => {
    if (connection) {
      return connection;
    }
    
    try {
      logger.info(`[NATS] Connecting to NATS server at ${NATS_URL}...`);
      connection = await connect({ servers: NATS_URL });
      
      logger.info('[NATS] Connection established successfully.');
      
      // Listen for connection events/status asynchronously
      (async () => {
        for await (const status of connection.status()) {
          logger.debug(`[NATS] Status change: ${status.type}`);
        }
      })().catch((err) => {
        logger.error(`[NATS] Connection status error: ${err.message}`);
      });

      return connection;
    } catch (err) {
      logger.error(`[NATS] Connection failed: ${err.message}`);
      throw err;
    }
  },

  /**
   * Get active connection, establishing if necessary
   */
  getConnection: async () => {
    if (!connection) {
      return await natsConfig.connect();
    }
    return connection;
  },

  /**
   * Gracefully close NATS connection
   */
  close: async () => {
    try {
      if (connection) {
        await connection.close();
        logger.info('[NATS] Connection closed gracefully.');
      }
    } catch (err) {
      logger.error(`[NATS] Error closing NATS connection: ${err.message}`);
    } finally {
      connection = null;
    }
  }
};

module.exports = natsConfig;
