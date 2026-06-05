'use strict';

/**
 * Service to manage users, implementing Dependency Injection pattern.
 * Constructor parameters are automatically resolved and injected by Awilix.
 */
class DiUserService {
  constructor({ userModel, logger }) {
    this.userModel = userModel;
    this.logger = logger;
  }

  async getAllUsers() {
    this.logger.info('[DI Service] Retrieving all users from database');
    return this.userModel.find({});
  }

  async getUserById(id) {
    this.logger.info(`[DI Service] Retrieving user details for ID: ${id}`);
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new Error(`User not found with ID ${id}`);
    }
    return user;
  }

  async createUser(userData) {
    this.logger.info(`[DI Service] Creating new user record: ${userData.email}`);
    // Check if user already exists
    const existing = await this.userModel.findOne({ email: userData.email });
    if (existing) {
      throw new Error('A user with this email address already exists');
    }
    return this.userModel.create(userData);
  }
}

module.exports = DiUserService;
