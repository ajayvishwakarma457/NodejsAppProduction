const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables before worker thread loads
dotenv.config({ path: path.join(__dirname, '../../.env') });

const logger = require('../../src/utils/logger');

const app = express();
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 6002;

app.use(express.json());

// Expose internal health statuses
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    service: 'Notification Service',
    timestamp: new Date().toISOString()
  });
});

const startService = () => {
  try {
    // Spin up background BullMQ Workers specifically inside the Notification Context
    require('../../src/workers/emailWorker');
    logger.info('[Notification Service] Background emailWorker routines initialized.');

    // Initialize domain event listeners
    require('../../src/listeners/userListeners');
    logger.info('[Notification Service] Domain event listener dispatches registered.');

    app.listen(PORT, () => {
      logger.info(`[Notification Service] Bounded Context active on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`[Notification Service] Failed to initialize service: ${err.message}`);
    process.exit(1);
  }
};

startService();
