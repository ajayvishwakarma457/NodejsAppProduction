const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables before routing or database setup
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../../src/config/db');
const User = require('../../src/models/userModel');
const logger = require('../../src/utils/logger');
const errorMiddleware = require('../../src/middlewares/v1/errorMiddleware');
const correlationIdMiddleware = require('../../src/middlewares/v1/correlationIdMiddleware');

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Load bounded context routing schemas
const authRoutes = require('../../src/routes/v1/authRoutes');
const userRoutes = require('../../src/routes/v1/userRoutes');

// Load proto file definitions
const PROTO_PATH = path.join(__dirname, './user.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

// Implement gRPC Service logic
const getUserInfo = async (call, callback) => {
  try {
    const { id } = call.request;
    const user = await User.findById(id);
    if (!user) {
      return callback({
        code: grpc.status.NOT_FOUND,
        details: `User with ID ${id} not found`,
      });
    }

    callback(null, {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error(`[User gRPC Server] Error fetching user ${call.request.id}: ${err.message}`);
    callback({
      code: grpc.status.INTERNAL,
      details: err.message,
    });
  }
};

const startGrpcServer = () => {
  const server = new grpc.Server();
  server.addService(userProto.UserService.service, { getUserInfo });
  
  const grpcPort = process.env.USER_SERVICE_GRPC_PORT || '50051';
  server.bindAsync(`127.0.0.1:${grpcPort}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      logger.error(`[User gRPC Server] Failed to bind: ${err.message}`);
      return;
    }
    logger.info(`[User gRPC Server] Active and listening on 127.0.0.1:${port}`);
  });
};

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 6001;

// Body parser and context tracking middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(correlationIdMiddleware);

// Mount core User domain routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Centralized error mapping middleware
app.use(errorMiddleware);

const serviceRegistry = require('../../src/utils/serviceRegistry');

const startService = async () => {
  try {
    await connectDB();
    const serverInstance = app.listen(PORT, () => {
      logger.info(`[User Identity Service] Bounded Context successfully active on port ${PORT}`);
      
      // Dynamic Service Registration with TTL and background heartbeat
      const instanceUrl = `http://127.0.0.1:${PORT}`;
      const stopHeartbeat = serviceRegistry.startHeartbeat('user-service', instanceUrl);
      
      const shutdown = async () => {
        logger.info('[User Identity Service] Shutting down service...');
        stopHeartbeat();
        await serviceRegistry.deregisterInstance('user-service', instanceUrl);
        serverInstance.close(() => {
          logger.info('[User Identity Service] Process terminated cleanly.');
          process.exit(0);
        });
      };
      
      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    });
    startGrpcServer();
  } catch (err) {
    logger.error(`[User Identity Service] Failed to initialize service: ${err.message}`);
    process.exit(1);
  }
};

startService();
