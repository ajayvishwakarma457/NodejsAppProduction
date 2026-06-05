'use strict';

/**
 * Outbound (Driven) Port Interface Contract for User persistence operations.
 * Any database adapter must implement these methods.
 */
class UserRepositoryPort {
  async save(userEntity) {
    throw new Error('UserRepositoryPort.save: Method not implemented');
  }

  async findById(id) {
    throw new Error('UserRepositoryPort.findById: Method not implemented');
  }

  async findByEmail(email) {
    throw new Error('UserRepositoryPort.findByEmail: Method not implemented');
  }

  async findAll() {
    throw new Error('UserRepositoryPort.findAll: Method not implemented');
  }
}

module.exports = UserRepositoryPort;
