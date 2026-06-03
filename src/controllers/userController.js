const UserModel = require('../models/userModel');

const UserController = {
  // GET /api/users (with optional query string search ?name=xxx)
  getUsers: (req, res, next) => {
    try {
      let users = UserModel.getAll();
      const { name } = req.query; // Query strings parsing
      
      if (name) {
        users = users.filter(u => u.name.toLowerCase().includes(name.toLowerCase()));
      }
      res.json(users);
    } catch (err) {
      next(err); // Pass error to express centralized error handler
    }
  },
  
  // GET /api/users/:id (Request params parsing)
  getUserById: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const user = UserModel.getById(id);
      
      if (!user) {
        const error = new Error(`User with ID ${id} not found`);
        error.status = 404;
        throw error;
      }
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
  
  // POST /api/users (Request body parsing)
  createUser: (req, res, next) => {
    try {
      const { name, email } = req.body;
      
      if (!name || !email) {
        const error = new Error("Name and email are required fields");
        error.status = 400;
        throw error;
      }
      
      const newUser = UserModel.create({ name, email });
      res.status(201).json(newUser);
    } catch (err) {
      next(err);
    }
  },
  
  // PUT /api/users/:id
  updateUser: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updatedUser = UserModel.update(id, req.body);
      
      if (!updatedUser) {
        const error = new Error(`User with ID ${id} not found to update`);
        error.status = 404;
        throw error;
      }
      res.json(updatedUser);
    } catch (err) {
      next(err);
    }
  },
  
  // DELETE /api/users/:id
  deleteUser: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const deleted = UserModel.delete(id);
      
      if (!deleted) {
        const error = new Error(`User with ID ${id} not found to delete`);
        error.status = 404;
        throw error;
      }
      res.status(204).end(); // 204 No Content
    } catch (err) {
      next(err);
    }
  }
};

module.exports = UserController;
