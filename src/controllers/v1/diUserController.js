'use strict';

const container = require('../../config/container');
const AppError = require('../../utils/AppError');

const diUserController = {
  // GET /api/v1/di-users
  getUsers: async (req, res, next) => {
    try {
      const diUserService = container.resolve('diUserService');
      const users = await diUserService.getAllUsers();
      res.status(200).json({
        status: 'success',
        results: users.length,
        data: users,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/di-users/:id
  getUserById: async (req, res, next) => {
    try {
      const diUserService = container.resolve('diUserService');
      const user = await diUserService.getUserById(req.params.id);
      res.status(200).json({
        status: 'success',
        data: user,
      });
    } catch (err) {
      next(new AppError(err.message, 404));
    }
  },

  // POST /api/v1/di-users
  createUser: async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return next(new AppError('Name, email, and password are required', 400));
      }

      const diUserService = container.resolve('diUserService');
      const user = await diUserService.createUser({ name, email, password, role });
      res.status(201).json({
        status: 'success',
        data: user,
      });
    } catch (err) {
      next(new AppError(err.message, 400));
    }
  }
};

module.exports = diUserController;
