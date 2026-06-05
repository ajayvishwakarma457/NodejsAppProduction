'use strict';

/**
 * Service to manage users, implementing Dependency Injection pattern.
 * Constructor parameters are automatically resolved and injected by Awilix.
 */
class DiUserService {
  constructor({ userRepository, logger }) {
    this.userRepository = userRepository;
    this.logger = logger;
  }

  async getAllUsers() {
    this.logger.info('[DI Service] Retrieving all users from repository');
    return this.userRepository.findAll();
  }

  async getUserById(id) {
    this.logger.info(`[DI Service] Retrieving user details for ID: ${id}`);
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error(`User not found with ID ${id}`);
    }
    return user;
  }

  async createUser(userData) {
    this.logger.info(`[DI Service] Creating new user record: ${userData.email}`);
    const existing = await this.userRepository.findByEmail(userData.email);
    if (existing) {
      throw new Error('A user with this email address already exists');
    }
    return this.userRepository.create(userData);
  }
}

module.exports = DiUserService;
