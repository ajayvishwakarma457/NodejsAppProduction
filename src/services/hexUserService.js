'use strict';

const UserEntity = require('../domain/userEntity');

/**
 * Core Application Service that orchestrates business use cases.
 * Interacts only with ports contract interfaces, keeping core business logic
 * fully decoupled from database adapter implementations.
 */
class HexUserService {
  constructor({ userRepositoryPort, logger }) {
    this.userRepositoryPort = userRepositoryPort;
    this.logger = logger;
  }

  async listAllUsers() {
    this.logger.info('[Hex Service] Querying all users via UserRepositoryPort');
    return this.userRepositoryPort.findAll();
  }

  async getUser(id) {
    this.logger.info(`[Hex Service] Querying user detail for ID: ${id} via UserRepositoryPort`);
    const user = await this.userRepositoryPort.findById(id);
    if (!user) {
      throw new Error(`User not found with ID ${id}`);
    }
    return user;
  }

  async createUser(userData) {
    this.logger.info(`[Hex Service] Creating new user use-case: ${userData.email}`);
    
    // Check port for existing address
    const existing = await this.userRepositoryPort.findByEmail(userData.email);
    if (existing) {
      throw new Error('A user with this email address already exists');
    }

    // Instantiates pure domain entity
    const userEntity = new UserEntity(userData);
    
    // Validate domain rules
    userEntity.validate();

    // Call outbound port adapter to save entity state
    return this.userRepositoryPort.save(userEntity);
  }
}

module.exports = HexUserService;
