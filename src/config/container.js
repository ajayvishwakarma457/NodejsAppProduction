const { createContainer, asClass, asValue } = require('awilix');
const userModel = require('../models/userModel');
const UserRepository = require('../repositories/userRepository');
const MongoUserRepositoryAdapter = require('../adapters/db/mongoUserRepositoryAdapter');
const diUserService = require('../services/diUserService');
const hexUserService = require('../services/hexUserService');
const logger = require('../utils/logger');

// Create the Dependency Injection Container
const container = createContainer();

// Register the application components in the container
container.register({
  // Register Winston logger as a static value
  logger: asValue(logger),

  // Register Mongoose User Model as a static value
  userModel: asValue(userModel),

  // Register User Repository as a class (Singleton lifetime)
  userRepository: asClass(UserRepository).singleton(),

  // Register User Service as a class (Singleton lifetime)
  diUserService: asClass(diUserService).singleton(),

  // Register Hexagonal Outbound Adapter class to satisfy the Outbound Port contract
  userRepositoryPort: asClass(MongoUserRepositoryAdapter).singleton(),

  // Register Hexagonal Application Service class
  hexUserService: asClass(hexUserService).singleton(),
});

module.exports = container;
