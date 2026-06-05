'use strict';

const UserRepositoryPort = require('../../domain/ports/userRepositoryPort');
const UserEntity = require('../../domain/userEntity');

/**
 * Outbound Adapter implementing UserRepositoryPort contract using Mongoose database.
 */
class MongoUserRepositoryAdapter extends UserRepositoryPort {
  constructor({ userModel }) {
    super();
    this.userModel = userModel;
  }

  // Map database document to domain UserEntity
  _toDomain(doc) {
    if (!doc) return null;
    return new UserEntity({
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      role: doc.role,
      status: doc.status
    });
  }

  async save(userEntity) {
    const data = {
      name: userEntity.name,
      email: userEntity.email,
      role: userEntity.role,
      status: userEntity.status
    };

    let doc;
    if (userEntity.id) {
      doc = await this.userModel.findByIdAndUpdate(userEntity.id, data, { new: true });
    } else {
      // Standard password generation for mock domain users creation
      data.password = 'DefaultDomainPass123!';
      doc = await this.userModel.create(data);
    }
    return this._toDomain(doc);
  }

  async findById(id) {
    const doc = await this.userModel.findById(id);
    return this._toDomain(doc);
  }

  async findByEmail(email) {
    const doc = await this.userModel.findOne({ email });
    return this._toDomain(doc);
  }

  async findAll() {
    const docs = await this.userModel.find({});
    return docs.map(doc => this._toDomain(doc));
  }
}

module.exports = MongoUserRepositoryAdapter;
