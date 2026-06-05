'use strict';

/**
 * Pure Domain Entity representing a User.
 * Free of frameworks, ORMs (Mongoose), database links, or HTTP concerns.
 */
class UserEntity {
  constructor({ id, name, email, role, status = 'active' }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role || 'user';
    this.status = status;
  }

  validate() {
    if (!this.name || this.name.trim() === '') {
      throw new Error('User name cannot be empty');
    }
    if (!this.email || !this.email.includes('@')) {
      throw new Error('User email must be a valid email address');
    }
  }

  isAdmin() {
    return this.role === 'admin';
  }

  deactivate() {
    this.status = 'inactive';
  }
}

module.exports = UserEntity;
