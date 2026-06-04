const crypto = require('crypto');
const ApiKey = require('../../models/apiKeyModel');
const AppError = require('../../utils/AppError');
const { hashKey } = require('../../middlewares/v1/apiKeyMiddleware');

const ApiKeyController = {
  // POST /api/v1/api-keys (Generates new API Key)
  createApiKey: async (req, res, next) => {
    try {
      const { name, expiresInDays } = req.body;

      if (!name) {
        return next(new AppError('Please provide a name for this API key', 400));
      }

      // Generate raw secure key (e.g. sk_live_f392...)
      const rawKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');

      // Hash key for DB storage
      const hashedKey = hashKey(rawKey);

      let expiresAt;
      if (expiresInDays) {
        expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
      }

      // Save key details
      const apiKey = await ApiKey.create({
        hashedKey,
        name,
        user: req.user._id,
        expiresAt,
      });

      res.status(201).json({
        status: 'success',
        apiKey: rawKey, // Raw key sent ONLY ONCE
        metadata: {
          id: apiKey._id,
          name: apiKey.name,
          isActive: apiKey.isActive,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/api-keys (Gets metadata of user's keys)
  getMyApiKeys: async (req, res, next) => {
    try {
      const keys = await ApiKey.find({ user: req.user._id }).select('-hashedKey');
      res.status(200).json(keys);
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/api-keys/:id (Revokes API Key)
  revokeApiKey: async (req, res, next) => {
    try {
      const { id } = req.params;
      const revoked = await ApiKey.findOneAndDelete({ _id: id, user: req.user._id });

      if (!revoked) {
        return next(new AppError('API key not found or you are not authorized to revoke it.', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'API key successfully revoked.',
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ApiKeyController;
