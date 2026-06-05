const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const logger = require('../utils/logger');

// Load protobuf definition
const PROTO_PATH = path.join(__dirname, '../protos/user.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

/**
 * Service Handler Implementations
 */
const UserServiceImpl = {
  // 1. Unary RPC
  getUser: (call, callback) => {
    const userId = call.request.id;
    logger.info(`[gRPC Server] Unary getUser invoked for ID: ${userId}`);

    if (userId === 'notfound') {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `User with ID ${userId} not found`,
      });
    }

    // Return mock user response
    callback(null, {
      id: userId,
      name: 'gRPC User Demo',
      email: 'grpc.demo@example.com',
      role: 'developer',
    });
  },

  // 2. Server Streaming RPC
  streamUserActivities: (call) => {
    const userId = call.request.userId;
    logger.info(`[gRPC Server] Server Streaming streamUserActivities invoked for User: ${userId}`);

    // Stream 3 mock activity events sequentially
    const activities = [
      { activityId: 'act-1', activityType: 'LOGIN', timestamp: new Date().toISOString(), details: 'Logged in from Web' },
      { activityId: 'act-2', activityType: 'UPDATE_PROFILE', timestamp: new Date().toISOString(), details: 'Updated avatar image' },
      { activityId: 'act-3', activityType: 'LOGOUT', timestamp: new Date().toISOString(), details: 'Logged out cleanly' }
    ];

    let count = 0;
    const intervalId = setInterval(() => {
      if (count < activities.length) {
        call.write(activities[count]);
        count++;
      } else {
        clearInterval(intervalId);
        call.end();
        logger.info('[gRPC Server] Server Streaming activities finished.');
      }
    }, 100);

    // Stop interval if client cancels/closes connection
    call.on('cancelled', () => {
      clearInterval(intervalId);
      logger.warn('[gRPC Server] Server Stream cancelled by client.');
    });
  },

  // 3. Client Streaming RPC
  uploadAuditLogs: (call, callback) => {
    logger.info('[gRPC Server] Client Streaming uploadAuditLogs active.');
    let processedCount = 0;

    call.on('data', (logRequest) => {
      logger.info(`[gRPC Server] Received audit log stream: ${logRequest.action} at ${logRequest.timestamp}`);
      processedCount++;
    });

    call.on('end', () => {
      logger.info(`[gRPC Server] Client Stream ended. Processed: ${processedCount} logs.`);
      callback(null, {
        processedCount,
        status: 'SUCCESSFUL',
      });
    });

    call.on('error', (err) => {
      logger.error(`[gRPC Server] Client Stream error: ${err.message}`);
    });
  },

  // 4. Bidirectional Streaming RPC
  realtimeChat: (call) => {
    logger.info('[gRPC Server] Bidirectional Streaming realtimeChat channel opened.');

    call.on('data', (chatMessage) => {
      logger.info(`[gRPC Server] Chat msg from [${chatMessage.sender}]: ${chatMessage.message}`);
      
      // Echo response stream back to client
      call.write({
        sender: 'Server Bot',
        message: `Echoing: "${chatMessage.message}"`,
        timestamp: new Date().toISOString(),
      });
    });

    call.on('end', () => {
      logger.info('[gRPC Server] Bidirectional Stream ended by client.');
      call.end();
    });

    call.on('error', (err) => {
      logger.error(`[gRPC Server] Bidirectional stream error: ${err.message}`);
    });
  }
};

/**
 * Utility to start gRPC Server
 */
const startGrpcServer = (port = 50051) => {
  const server = new grpc.Server();
  server.addService(userProto.UserService.service, UserServiceImpl);
  
  return new Promise((resolve, reject) => {
    server.bindAsync(`127.0.0.1:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
      if (err) {
        logger.error(`[gRPC Server] Start failed: ${err.message}`);
        return reject(err);
      }
      server.start();
      logger.info(`[gRPC Server] Bounded context listening on port: ${boundPort}`);
      resolve(server);
    });
  });
};

module.exports = {
  startGrpcServer,
  UserServiceImpl,
  userProto,
};
