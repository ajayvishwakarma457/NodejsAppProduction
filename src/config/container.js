const { createContainer, asClass, asValue } = require('awilix');
const userModel = require('../models/userModel');
const diUserService = require('../services/diUserService');
const logger = require('../utils/logger');

// Create the Dependency Injection Container
const container = createContainer();

// Register the application components in the container
container.register({
  // Register Winston logger as a static value
  logger: asValue(logger),

  // Register Mongoose User Model as a static value
  userModel: asValue(userModel),

  // Register User Service as a class (Singleton lifetime)
  diUserService: asClass(diUserService).singleton(),
});

module.exports = container;
