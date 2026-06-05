'use strict';

const container = require('../../config/container');
const AppError = require('../../utils/AppError');

const hexUserController = {
  // GET /api/v1/hex-users
  getUsers: async (req, res, next) => {
    try {
      const hexUserService = container.resolve('hexUserService');
      const users = await hexUserService.listAllUsers();
      res.status(200).json({
        status: 'success',
        results: users.length,
        data: users,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/hex-users/:id
  getUserById: async (req, res, next) => {
    try {
      const hexUserService = container.resolve('hexUserService');
      const user = await hexUserService.getUser(req.params.id);
      res.status(200).json({
        status: 'success',
        data: user,
      });
    } catch (err) {
      next(new AppError(err.message, 404));
    }
  },

  // POST /api/v1/hex-users
  createUser: async (req, res, next) => {
    try {
      const { name, email, role } = req.body;
      if (!name || !email) {
        return next(new AppError('Name and email are required', 400));
      }

      const hexUserService = container.resolve('hexUserService');
      const user = await hexUserService.createUser({ name, email, role });
      res.status(201).json({
        status: 'success',
        data: user,
      });
    } catch (err) {
      next(new AppError(err.message, 400));
    }
  }
};

module.exports = hexUserController;
