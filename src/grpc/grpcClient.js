const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const logger = require('../utils/logger');

const PROTO_PATH = path.join(__dirname, '../protos/user.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;
const GRPC_PORT = process.env.GRPC_PORT || 50051;

// Instantiate gRPC client
const grpcClient = new userProto.UserService(
  `127.0.0.1:${GRPC_PORT}`,
  grpc.credentials.createInsecure()
);

module.exports = grpcClient;
