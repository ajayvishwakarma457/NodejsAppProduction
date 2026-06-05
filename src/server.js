const path = require('path');
const dotenv = require('dotenv');

// Load environment variables before importing app
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to Database
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    
    // Initialize cache Pub/Sub invalidation listener
    const PubSubInvalidator = require('./utils/pubSubInvalidator');
    PubSubInvalidator.initListener();

    // Initialize BullMQ Workers to process background jobs
    require('./workers/emailWorker');

    // Initialize scheduled cron jobs
    const CronScheduler = require('./utils/cronScheduler');
    CronScheduler.init();

    // Register decoupled event listeners
    require('./listeners/userListeners');
  });

  // Initialize Socket.io real-time server
  const socketService = require('./utils/socketService');
  socketService.init(server);

  // Initialize lightweight ws real-time server
  const wsService = require('./utils/wsService');
  wsService.attach(server);

  // Handle graceful shutdown
  const gracefulShutdown = async () => {
    console.log('Shutting down server gracefully...');
    try {
      const emailWorker = require('./workers/emailWorker');
      await emailWorker.close();
      console.log('BullMQ emailWorker closed.');
    } catch (err) {
      console.error('Error closing BullMQ worker:', err.message);
    }
    try {
      const CronScheduler = require('./utils/cronScheduler');
      CronScheduler.stop();
    } catch (err) {
      console.error('Error stopping cron scheduler:', err.message);
    }
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

startServer();


