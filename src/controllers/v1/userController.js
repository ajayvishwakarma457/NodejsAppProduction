const UserModel = require('../../models/userModel');
const AppError = require('../../utils/AppError');

const UserController = {
  // GET /api/v1/users (with optional query string search ?name=xxx)
  getUsers: (req, res, next) => {
    try {
      let users = UserModel.getAll();
      const { name } = req.query;
      
      if (name) {
        users = users.filter(u => u.name.toLowerCase().includes(name.toLowerCase()));
      }
      res.json(users);
    } catch (err) {
      next(err);
    }
  },
  
  // GET /api/v1/users/:id
  getUserById: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const user = UserModel.getById(id);
      
      if (!user) {
        return next(new AppError(`User with ID ${id} not found`, 404));
      }
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
  
  // POST /api/v1/users
  createUser: (req, res, next) => {
    try {
      const { name, email } = req.body;
      
      if (!name || !email) {
        return next(new AppError("Name and email are required fields", 400));
      }
      
      const newUser = UserModel.create({ name, email });
      res.status(201).json(newUser);
    } catch (err) {
      next(err);
    }
  },
  
  // PUT /api/v1/users/:id
  updateUser: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updatedUser = UserModel.update(id, req.body);
      
      if (!updatedUser) {
        return next(new AppError(`User with ID ${id} not found to update`, 404));
      }
      res.json(updatedUser);
    } catch (err) {
      next(err);
    }
  },
  
  // DELETE /api/v1/users/:id
  deleteUser: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const deleted = UserModel.delete(id);
      
      if (!deleted) {
        return next(new AppError(`User with ID ${id} not found to delete`, 404));
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
};

module.exports = UserController;
