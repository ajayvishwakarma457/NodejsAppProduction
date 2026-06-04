const { redisClient } = require('../../middlewares/v1/rateLimiter');
const AppError = require('../../utils/AppError');

const RedisDemoController = {
  // POST /api/v1/redis-demo/string
  setString: async (req, res, next) => {
    try {
      const { key, value, ttl } = req.body; // ttl in seconds

      if (!key || !value) {
        return next(new AppError('Please provide key and value', 400));
      }

      // If TTL is provided, use SETEX, else SET
      if (ttl) {
        await redisClient.set(`demo_str:${key}`, value, 'EX', parseInt(ttl, 10));
      } else {
        await redisClient.set(`demo_str:${key}`, value);
      }

      res.status(200).json({
        status: 'success',
        message: `String key demo_str:${key} set successfully.`,
        ttl: ttl || 'none',
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/redis-demo/string/:key
  getString: async (req, res, next) => {
    try {
      const { key } = req.params;
      const value = await redisClient.get(`demo_str:${key}`);

      res.status(200).json({
        status: 'success',
        key: `demo_str:${key}`,
        value: value, // will be null if expired or not found
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/redis-demo/hash
  setHash: async (req, res, next) => {
    try {
      const { key, data, ttl } = req.body; // data is an object

      if (!key || !data || typeof data !== 'object') {
        return next(new AppError('Please provide key and a data object', 400));
      }

      // Set fields in the hash
      const hashKey = `demo_hash:${key}`;
      await redisClient.hset(hashKey, data);

      if (ttl) {
        await redisClient.expire(hashKey, parseInt(ttl, 10));
      }

      res.status(200).json({
        status: 'success',
        message: `Hash key ${hashKey} set successfully.`,
        ttl: ttl || 'none',
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/redis-demo/hash/:key
  getHash: async (req, res, next) => {
    try {
      const { key } = req.params;
      const hashKey = `demo_hash:${key}`;
      const data = await redisClient.hgetall(hashKey);

      res.status(200).json({
        status: 'success',
        key: hashKey,
        data: Object.keys(data).length > 0 ? data : null,
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/redis-demo/leaderboard
  addToLeaderboard: async (req, res, next) => {
    try {
      const { username, score } = req.body;

      if (!username || score === undefined) {
        return next(new AppError('Please provide username and score', 400));
      }

      const leaderboardKey = 'demo_leaderboard';
      // ZADD key score member
      await redisClient.zadd(leaderboardKey, parseFloat(score), username);

      res.status(200).json({
        status: 'success',
        message: `Added ${username} with score ${score} to leaderboard.`,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/redis-demo/leaderboard
  getLeaderboard: async (req, res, next) => {
    try {
      const leaderboardKey = 'demo_leaderboard';
      // Retrieve top 10 elements in descending order (highest score first)
      const list = await redisClient.zrevrange(leaderboardKey, 0, 9, 'WITHSCORES');

      // format return as structured array: [{username, score}]
      const leaderboard = [];
      for (let i = 0; i < list.length; i += 2) {
        leaderboard.push({
          username: list[i],
          score: parseFloat(list[i + 1]),
        });
      }

      res.status(200).json({
        status: 'success',
        leaderboard,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = RedisDemoController;
