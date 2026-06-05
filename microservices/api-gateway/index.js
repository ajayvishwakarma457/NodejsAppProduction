const express = require('express');
const proxy = require('express-http-proxy');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');

// Load env properties
dotenv.config({ path: path.join(__dirname, '../../.env') });

const logger = require('../../src/utils/logger');
const correlationIdMiddleware = require('../../src/middlewares/v1/correlationIdMiddleware');
const versionNegotiator = require('../../src/middlewares/v1/versionNegotiator');

const app = express();
const PORT = process.env.GATEWAY_PORT || 6000;

// Mount global edge policies
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(correlationIdMiddleware);
app.use(versionNegotiator);

// Define service locations
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:6001';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:6002';

logger.info(`[API Gateway] Routing users & auth to: ${USER_SERVICE_URL}`);
logger.info(`[API Gateway] Routing notifications to: ${NOTIFICATION_SERVICE_URL}`);

// Route proxies
app.use('/api/v1/auth', proxy(USER_SERVICE_URL, {
  proxyReqPathResolver: (req) => `/api/v1/auth${req.url}`,
}));

app.use('/api/v1/users', proxy(USER_SERVICE_URL, {
  proxyReqPathResolver: (req) => `/api/v1/users${req.url}`,
}));

app.use('/api/v1/notifications', proxy(NOTIFICATION_SERVICE_URL, {
  proxyReqPathResolver: (req) => `/api/v1/notifications${req.url}`,
}));

// Basic edge gateway health check
app.use('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    service: 'API Gateway',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  logger.info(`[API Gateway] Service initialized and listening on port ${PORT}`);
});
