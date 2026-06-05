const User = require('../../models/userModel');
const AppError = require('../../utils/AppError');
const { redisClient } = require('../../middlewares/v1/rateLimiter');
const PubSubInvalidator = require('../../utils/pubSubInvalidator');
const localCache = require('../../utils/localCache');

const UserController = {
  // GET /api/v1/users (with dynamic filtering, sorting, field selection, and pagination)
  getUsers: async (req, res, next) => {
    try {
      // 1. Filtering
      const queryObj = { ...req.query };
      const excludedFields = ['page', 'sort', 'limit', 'fields', 'cursor', 'type'];
      excludedFields.forEach((el) => delete queryObj[el]);

      // Advanced filtering for Mongo operators (gte, gt, lte, lt)
      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
      let filterQuery = JSON.parse(queryStr);

      if (filterQuery.name) {
        // Support case-insensitive name filter regex
        filterQuery.name = { $regex: filterQuery.name, $options: 'i' };
      }

      const parsedLimit = Math.min(parseInt(req.query.limit, 10) || 10, 100);

      // --- 1. Cursor-Based Pagination ---
      if (req.query.type === 'cursor' || req.query.cursor) {
        let cursorQuery = { ...filterQuery };
        if (req.query.cursor) {
          cursorQuery._id = { $gt: req.query.cursor }; // Sort ascending by _id
        }

        let dbQuery = User.find(cursorQuery).sort({ _id: 1 });

        // Field Selection
        if (req.query.fields) {
          const fields = req.query.fields.split(',').join(' ');
          dbQuery = dbQuery.select(fields);
        } else {
          dbQuery = dbQuery.select('-__v'); // Exclude Mongo internal version flags by default
        }

        const users = await dbQuery.limit(parsedLimit + 1).lean();

        const hasNextPage = users.length > parsedLimit;
        if (hasNextPage) {
          users.pop(); // discard the extra record
        }

        const nextCursor = hasNextPage ? users[users.length - 1]._id : null;

        return res.status(200).json({
          status: 'success',
          pagination: {
            type: 'cursor',
            limit: parsedLimit,
            nextCursor,
            hasNextPage,
          },
          results: users.length,
          data: users,
        });
      }

      // --- 2. Offset-Based Pagination (Default) ---
      const parsedPage = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const skip = (parsedPage - 1) * parsedLimit;

      let dbQuery = User.find(filterQuery);

      // Sorting
      if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        dbQuery = dbQuery.sort(sortBy);
      } else {
        dbQuery = dbQuery.sort({ _id: 1 }); // Default fallback sorting
      }

      // Field Selection
      if (req.query.fields) {
        const fields = req.query.fields.split(',').join(' ');
        dbQuery = dbQuery.select(fields);
      } else {
        dbQuery = dbQuery.select('-__v'); // Exclude Mongo internal version flags by default
      }

      dbQuery = dbQuery.skip(skip).limit(parsedLimit);

      const [users, totalCount] = await Promise.all([
        dbQuery.lean(),
        User.countDocuments(filterQuery),
      ]);

      const totalPages = Math.ceil(totalCount / parsedLimit);

      return res.status(200).json({
        status: 'success',
        pagination: {
          type: 'offset',
          page: parsedPage,
          limit: parsedLimit,
          totalCount,
          totalPages,
          hasNextPage: parsedPage < totalPages,
          hasPrevPage: parsedPage > 1,
        },
        results: users.length,
        data: users,
      });
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

      // 1. Try fetching from L1 Cache (local memory)
      const cachedL1 = localCache.get(cacheKey);
      if (cachedL1) {
        console.log(`[Cache-aside] L1 HIT for user:${id}`);
        return res.json(cachedL1);
      }

      console.log(`[Cache-aside] L1 MISS for user:${id}. Checking L2 Cache (Redis)...`);

      // 2. Try fetching from L2 Cache (Redis)
      const cachedL2 = await redisClient.get(cacheKey);
      if (cachedL2) {
        console.log(`[Cache-aside] L2 HIT for user:${id}. Populating L1...`);
        const userObj = JSON.parse(cachedL2);
        
        // Save to local cache L1 (5 minutes TTL = 300s)
        localCache.set(cacheKey, userObj, 300);
        return res.json(userObj);
      }

      console.log(`[Cache-aside] L2 MISS for user:${id}. Querying MongoDB database...`);
      // 3. Query database on L1/L2 Cache Miss
      const user = await User.findById(id);
      if (!user) {
        return next(new AppError(`User with ID ${id} not found`, 404));
      }

      // 4. Save to Redis L2 (1-hour TTL = 3600s)
      await redisClient.set(cacheKey, JSON.stringify(user), 'EX', 3600);

      // 5. Save to local cache L1 (5 minutes TTL = 300s)
      localCache.set(cacheKey, user.toObject(), 300);

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
