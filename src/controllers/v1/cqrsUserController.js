const userCommandHandler = require('../../services/userCommandHandler');
const userQueryHandler = require('../../services/userQueryHandler');
const userProjection = require('../../projections/userProjection');
const AppError = require('../../utils/AppError');

const cqrsUserController = {
  // Query: GET /api/v1/cqrs-users
  getUsers: async (req, res, next) => {
    try {
      const users = await userQueryHandler.getAllUsers();
      res.status(200).json({
        status: 'success',
        results: users.length,
        data: users,
      });
    } catch (err) {
      next(err);
    }
  },

  // Query: GET /api/v1/cqrs-users/:id
  getUserById: async (req, res, next) => {
    try {
      const user = await userQueryHandler.getUserById(req.params.id);
      res.status(200).json({
        status: 'success',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  },

  // Command: POST /api/v1/cqrs-users
  createUser: async (req, res, next) => {
    try {
      const { name, email, role } = req.body;
      if (!name || !email) {
        return next(new AppError('Name and email are required', 400));
      }

      const aggregateId = await userCommandHandler.createUser(name, email, role);
      res.status(201).json({
        status: 'success',
        message: 'Create User Command executed successfully',
        data: { id: aggregateId, version: 1 },
      });
    } catch (err) {
      next(err);
    }
  },

  // Command: PATCH /api/v1/cqrs-users/:id
  updateUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, email, role, status, expectedVersion } = req.body;

      if (expectedVersion === undefined) {
        return next(new AppError('expectedVersion field is required for optimistic concurrency checks', 400));
      }

      const aggregateId = await userCommandHandler.updateUser(
        id,
        parseInt(expectedVersion, 10),
        name,
        email,
        role,
        status
      );

      res.status(200).json({
        status: 'success',
        message: 'Update User Command executed successfully',
        data: { id: aggregateId, version: parseInt(expectedVersion, 10) + 1 },
      });
    } catch (err) {
      next(err);
    }
  },

  // Command: DELETE /api/v1/cqrs-users/:id
  deleteUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { expectedVersion } = req.body;

      if (expectedVersion === undefined) {
        return next(new AppError('expectedVersion is required for optimistic concurrency checks', 400));
      }

      await userCommandHandler.deleteUser(id, parseInt(expectedVersion, 10));

      res.status(200).json({
        status: 'success',
        message: 'Delete User Command executed successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // Command: POST /api/v1/cqrs-users/:id/replay
  replayEvents: async (req, res, next) => {
    try {
      const { id } = req.params;
      const rebuiltState = await userProjection.replayEvents(id);

      res.status(200).json({
        status: 'success',
        message: 'Event stream replayed and read view reconstructed successfully',
        data: rebuiltState,
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = cqrsUserController;
