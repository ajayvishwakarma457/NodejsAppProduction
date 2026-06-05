// Initialize OpenTelemetry distributed tracing SDK before any other module loads
const { initOTel } = require('./utils/otel');
initOTel();

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables before importing app
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const cluster = require('cluster');
const os = require('os');
const connectDB = require('./config/db');
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Retrieve secret properties dynamically from AWS Secrets Manager or HashiCorp Vault
  const loadSecrets = require('./config/secrets');
  await loadSecrets();

  // Connect to Database
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    
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

    // Start synthetic uptime prober if enabled
    if (process.env.SYNTHETIC_PROBER_ENABLED === 'true') {
      const syntheticProber = require('./utils/syntheticProber');
      syntheticProber.start();
    }
  });

  // Initialize Socket.io real-time server
  const socketService = require('./utils/socketService');
  socketService.init(server);

  // Initialize lightweight ws real-time server
  const wsService = require('./utils/wsService');
  wsService.attach(server);

  // Handle graceful shutdown
  const gracefulShutdown = async () => {
    logger.info('Shutting down server gracefully...');
    try {
      const syntheticProber = require('./utils/syntheticProber');
      syntheticProber.stop();
    } catch (err) {
      logger.error(`Error stopping synthetic prober: ${err.message}`);
    }
    try {
      const emailWorker = require('./workers/emailWorker');
      await emailWorker.close();
      logger.info('BullMQ emailWorker closed.');
    } catch (err) {
      logger.error(`Error closing BullMQ worker: ${err.message}`);
    }
    try {
      const CronScheduler = require('./utils/cronScheduler');
      CronScheduler.stop();
    } catch (err) {
      logger.error(`Error stopping cron scheduler: ${err.message}`);
    }
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

if (process.env.CLUSTER_MODE === 'true' && (cluster.isPrimary || cluster.isMaster)) {
  const numCPUs = os.cpus().length;
  logger.info(`[Cluster Master] Primary process ${process.pid} is running. Forking ${numCPUs} workers...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`[Cluster Master] Worker process ${worker.process.pid} exited (Code: ${code}, Signal: ${signal}). Re-forking worker...`);
    cluster.fork();
  });
} else {
  startServer();
}



