const User = require('../../models/userModel');
const AppError = require('../../utils/AppError');
const { redisClient } = require('../../middlewares/v1/rateLimiter');
const PubSubInvalidator = require('../../utils/pubSubInvalidator');

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

  // GET /api/v1/users/search
  searchUsers: async (req, res, next) => {
    try {
      const { q } = req.query;
      if (!q) {
        return next(new AppError('Please provide a search term via ?q=', 400));
      }

      // Optimize: lean() to skip mongoose document instantiation, select() to retrieve required fields only
      const users = await User.find(
        { $text: { $search: q } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .select('name email role')
        .lean();

      res.status(200).json({
        status: 'success',
        results: users.length,
        data: users,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/users/search/explain
  explainSearch: async (req, res, next) => {
    try {
      const { q } = req.query;
      if (!q) {
        return next(new AppError('Please provide a search term via ?q=', 400));
      }

      // Generate the query plan explanation
      const explanation = await User.find(
        { $text: { $search: q } }
      )
        .select('name email role')
        .explain('executionStats');

      res.status(200).json({
        status: 'success',
        explanation,
      });
    } catch (err) {
      next(err);
    }
  },
  
  // GET /api/v1/users/:id
  getUserById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const cacheKey = `user_cache:${id}`;

      // 1. Try fetching from Redis cache
      const cachedUser = await redisClient.get(cacheKey);
      if (cachedUser) {
        console.log(`[Cache-aside] Cache HIT for user:${id}`);
        return res.json(JSON.parse(cachedUser));
      }

      console.log(`[Cache-aside] Cache MISS for user:${id}. Querying database...`);
      // 2. Query database on Cache Miss
      const user = await User.findById(id);
      if (!user) {
        return next(new AppError(`User with ID ${id} not found`, 404));
      }

      // 3. Save to Redis cache with a 1-hour TTL (3600 seconds)
      await redisClient.set(cacheKey, JSON.stringify(user), 'EX', 3600);

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

      // 4. Invalidate cache on update (Publish event)
      const cacheKey = `user_cache:${id}`;
      await PubSubInvalidator.publishInvalidation(cacheKey);

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

      // 5. Invalidate cache on delete (Publish event)
      const cacheKey = `user_cache:${id}`;
      await PubSubInvalidator.publishInvalidation(cacheKey);

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/users/stats
  getUserStats: async (req, res, next) => {
    try {
      const stats = await User.aggregate([
        {
          $facet: {
            totalUsers: [
              { $count: 'count' }
            ],
            byRole: [
              {
                $group: {
                  _id: '$role',
                  count: { $sum: 1 }
                }
              },
              { $sort: { count: -1 } }
            ],
            byMonth: [
              {
                $group: {
                  _id: {
                    month: { $month: '$createdAt' },
                    year: { $year: '$createdAt' }
                  },
                  count: { $sum: 1 }
                }
              },
              { $sort: { '_id.year': -1, '_id.month': -1 } }
            ]
          }
        },
        {
          $project: {
            totalUsers: { $arrayElemAt: ['$totalUsers.count', 0] },
            byRole: 1,
            byMonth: 1
          }
        }
      ]);

      res.status(200).json({
        status: 'success',
        data: stats[0] || { totalUsers: 0, byRole: [], byMonth: [] }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = UserController;
