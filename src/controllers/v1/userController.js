const User = require('../../models/userModel');
const AppError = require('../../utils/AppError');

const UserController = {
  // GET /api/v1/users (with optional query string search ?name=xxx)
  getUsers: async (req, res, next) => {
    try {
      const { name } = req.query;
      let query = {};

      if (name) {
        // Case-insensitive regex search
        query.name = { $regex: name, $options: 'i' };
      }

      const users = await User.find(query);
      res.json(users);
    } catch (err) {
      next(err);
    }
  },
  
  // GET /api/v1/users/:id
  getUserById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      
      if (!user) {
        return next(new AppError(`User with ID ${id} not found`, 404));
      }
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
  
  // POST /api/v1/users
  createUser: async (req, res, next) => {
    try {
      const { name, email } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return next(new AppError('A user with this email already exists', 400));
      }

      const newUser = await User.create({ name, email });
      res.status(201).json(newUser);
    } catch (err) {
      next(err);
    }
  },
  
  // PUT /api/v1/users/:id
  updateUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const updatedUser = await User.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!updatedUser) {
        return next(new AppError(`User with ID ${id} not found to update`, 404));
      }
      res.json(updatedUser);
    } catch (err) {
      next(err);
    }
  },
  
  // DELETE /api/v1/users/:id
  deleteUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const deletedUser = await User.findByIdAndDelete(id);
      
      if (!deletedUser) {
        return next(new AppError(`User with ID ${id} not found to delete`, 404));
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
};

module.exports = UserController;
