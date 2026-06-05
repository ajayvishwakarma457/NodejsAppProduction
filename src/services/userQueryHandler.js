const UserReadView = require('../models/userReadViewModel');
const AppError = require('../utils/AppError');

const userQueryHandler = {
  /**
   * Get user by ID from read model
   * @param {string} id - User aggregate ID
   */
  getUserById: async (id) => {
    const user = await UserReadView.findOne({ _id: id, isDeleted: false });
    if (!user) {
      throw new AppError('User not found in read view model', 404);
    }
    return user;
  },

  /**
   * Get all active users from read model
   */
  getAllUsers: async () => {
    return await UserReadView.find({ isDeleted: false });
  }
};

module.exports = userQueryHandler;
