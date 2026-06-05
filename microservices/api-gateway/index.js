const express = require('express');
const proxy = require('express-http-proxy');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Load env properties
dotenv.config({ path: path.join(__dirname, '../../.env') });

const logger = require('../../src/utils/logger');
const correlationIdMiddleware = require('../../src/middlewares/v1/correlationIdMiddleware');
const versionNegotiator = require('../../src/middlewares/v1/versionNegotiator');

const app = express();
const PORT = process.env.GATEWAY_PORT || 6000;

// Load proto file definitions for user-service gRPC interface
const PROTO_PATH = path.join(__dirname, '../user-service/user.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

const grpcPort = process.env.USER_SERVICE_GRPC_PORT || '50051';
const userClient = new userProto.UserService(
  `127.0.0.1:${grpcPort}`,
  grpc.credentials.createInsecure()
);

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

// Route handler for synchronous gRPC communication demonstration
app.get('/api/v1/grpc-user/:id', (req, res) => {
  const { id } = req.params;
  
  userClient.getUserInfo({ id }, (err, response) => {
    if (err) {
      logger.error(`[API Gateway] gRPC error calling getUserInfo for user ${id}: ${err.message}`);
      if (err.code === grpc.status.NOT_FOUND) {
        return res.status(404).json({
          status: 'fail',
          message: err.details || 'User not found via gRPC',
        });
      }
      return res.status(500).json({
        status: 'error',
        message: err.details || 'Internal server error via gRPC',
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: response,
    });
  });
});

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

