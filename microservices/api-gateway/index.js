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

const jwt = require('jsonwebtoken');

const serviceRegistry = require('../../src/utils/serviceRegistry');

// Define default service locations for fallback
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:6001';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:6002';

logger.info(`[API Gateway] Routing users & auth to (default): ${USER_SERVICE_URL}`);
logger.info(`[API Gateway] Routing notifications to (default): ${NOTIFICATION_SERVICE_URL}`);

// Local cache for registered service instances
const serviceHosts = {
  'user-service': [],
  'notification-service': [],
};
const roundRobinIndex = {
  'user-service': 0,
  'notification-service': 0,
};

const updateRegistryCache = async () => {
  try {
    serviceHosts['user-service'] = await serviceRegistry.getInstances('user-service');
    serviceHosts['notification-service'] = await serviceRegistry.getInstances('notification-service');
  } catch (err) {
    logger.error(`[API Gateway LB Cache] Failed to sync registry: ${err.message}`);
  }
};

// Start update interval (every 2 seconds) to sync with Redis registry
const cacheInterval = setInterval(updateRegistryCache, 2000);
// Prevent blocking process shutdown in tests
if (cacheInterval.unref) {
  cacheInterval.unref();
}
updateRegistryCache();

// Helper to resolve host dynamically (Round-Robin client-side LB)
const getServiceHost = (serviceName, fallbackUrl) => {
  const hosts = serviceHosts[serviceName];
  if (!hosts || hosts.length === 0) {
    return fallbackUrl;
  }
  const index = roundRobinIndex[serviceName] % hosts.length;
  roundRobinIndex[serviceName]++;
  const targetHost = hosts[index];
  logger.info(`[API Gateway LB] Routing to ${serviceName} host: ${targetHost}`);
  return targetHost;
};

// Authentication Parser Middleware on Gateway Edge
const gatewayAuthParser = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      // Check if dual bearer prefix is present
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      logger.info(`[API Gateway Auth] Authenticated user ${decoded.id} at the edge layer.`);
    } catch (err) {
      logger.warn(`[API Gateway Auth] Token verification rejected: ${err.message}`);
    }
  }
  next();
};

app.use(gatewayAuthParser);

// Share standard options with downstreams, injecting offloaded auth context headers
const proxyOptions = {
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    if (srcReq.user) {
      proxyReqOpts.headers['x-user-id'] = srcReq.user.id;
      proxyReqOpts.headers['x-user-role'] = srcReq.user.role || 'user';
    }
    return proxyReqOpts;
  }
};

// Route proxies using dynamic host resolution functions
app.use('/api/v1/auth', proxy(() => getServiceHost('user-service', USER_SERVICE_URL), {
  proxyReqPathResolver: (req) => `/api/v1/auth${req.url}`,
  ...proxyOptions
}));

app.use('/api/v1/users', proxy(() => getServiceHost('user-service', USER_SERVICE_URL), {
  proxyReqPathResolver: (req) => `/api/v1/users${req.url}`,
  ...proxyOptions
}));

app.use('/api/v1/notifications', proxy(() => getServiceHost('notification-service', NOTIFICATION_SERVICE_URL), {
  proxyReqPathResolver: (req) => `/api/v1/notifications${req.url}`,
  ...proxyOptions
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

