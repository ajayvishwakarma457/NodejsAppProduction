'use strict';

/**
 * Repository layer to isolate raw database operations using Mongoose.
 * Receives the database userModel via constructor injection.
 */
class UserRepository {
  constructor({ userModel }) {
    this.userModel = userModel;
  }

  async findAll() {
    return this.userModel.find({});
  }

  async findById(id) {
    return this.userModel.findById(id);
  }

  async findByEmail(email) {
    return this.userModel.findOne({ email });
  }

  async create(userData) {
    return this.userModel.create(userData);
  }
}

module.exports = UserRepository;
