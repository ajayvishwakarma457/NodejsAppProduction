const { randomUUID } = require('crypto');
const EventStore = require('../models/eventStoreModel');
const UserReadView = require('../models/userReadViewModel');
const userProjection = require('../projections/userProjection');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const userCommandHandler = {
  /**
   * Execute Create User command
   */
  createUser: async (name, email, role) => {
    // 1. Verify email uniqueness on the read model to prevent duplicates
    const existing = await UserReadView.findOne({ email, isDeleted: false });
    if (existing) {
      throw new AppError('A user with this email already exists', 400);
    }

    const aggregateId = randomUUID();
    const version = 1;

    const event = new EventStore({
      aggregateId,
      aggregateType: 'User',
      eventType: 'USER_CREATED',
      eventData: { name, email, role: role || 'user', status: 'active' },
      version,
    });

    try {
      // 2. Persist to event log
      await event.save();
      
      // 3. Project to read view
      await userProjection.handleEvent(event);
      
      logger.info(`[Command Handler] Successfully handled CREATE command for aggregate: ${aggregateId}`);
      return aggregateId;
    } catch (err) {
      logger.error(`[Command Handler] Create user command failed: ${err.message}`);
      throw err;
    }
  },

  /**
   * Execute Update User command with Optimistic Concurrency Control
   */
  updateUser: async (aggregateId, expectedVersion, name, email, role, status) => {
    // 1. Retrieve current read model version to check concurrency rules
    const readView = await UserReadView.findById(aggregateId);
    if (!readView || readView.isDeleted) {
      throw new AppError('User not found', 404);
    }

    if (readView.version !== expectedVersion) {
      throw new AppError(
        `Concurrency Exception: The user state has changed. Expected version: ${expectedVersion}, Current version: ${readView.version}`,
        409
      );
    }

    const nextVersion = expectedVersion + 1;

    const event = new EventStore({
      aggregateId,
      aggregateType: 'User',
      eventType: 'USER_UPDATED',
      eventData: {
        name: name !== undefined ? name : readView.name,
        email: email !== undefined ? email : readView.email,
        role: role !== undefined ? role : readView.role,
        status: status !== undefined ? status : readView.status,
      },
      version: nextVersion,
    });

    try {
      // 2. Persist event log. The compound unique index on { aggregateId, version } enforces OCC database-wide
      await event.save();

      // 3. Sync to projection read view
      await userProjection.handleEvent(event);

      logger.info(`[Command Handler] Successfully handled UPDATE command for aggregate: ${aggregateId} to version ${nextVersion}`);
      return aggregateId;
    } catch (err) {
      // MongoDB duplicate key error index: aggregateId_1_version_1
      if (err.code === 11000) {
        throw new AppError(
          `Concurrency Exception: Duplicate version ${nextVersion} detected. Write rejected.`,
          409
        );
      }
      throw err;
    }
  },

  /**
   * Execute Delete User command
   */
  deleteUser: async (aggregateId, expectedVersion) => {
    const readView = await UserReadView.findById(aggregateId);
    if (!readView || readView.isDeleted) {
      throw new AppError('User not found', 404);
    }

    if (readView.version !== expectedVersion) {
      throw new AppError(
        `Concurrency Exception: Outdated aggregate state. Expected version: ${expectedVersion}, Current version: ${readView.version}`,
        409
      );
    }

    const nextVersion = expectedVersion + 1;

    const event = new EventStore({
      aggregateId,
      aggregateType: 'User',
      eventType: 'USER_DELETED',
      eventData: {},
      version: nextVersion,
    });

    try {
      await event.save();
      await userProjection.handleEvent(event);
      logger.info(`[Command Handler] Successfully handled DELETE command for aggregate: ${aggregateId}`);
      return aggregateId;
    } catch (err) {
      if (err.code === 11000) {
        throw new AppError(
          `Concurrency Exception: Duplicate version ${nextVersion} detected. Write rejected.`,
          409
        );
      }
      throw err;
    }
  }
};

module.exports = userCommandHandler;
