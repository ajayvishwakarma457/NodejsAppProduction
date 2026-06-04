const crypto = require('crypto');
const ApiKey = require('../../models/apiKeyModel');
const User = require('../../models/userModel');
const AppError = require('../../utils/AppError');

// Helper to hash key
const hashKey = (key) => {
  return crypto.createHash('sha256').update(key).digest('hex');
};

const apiKeyAuth = async (req, res, next) => {
  try {
    const key = req.headers['x-api-key'];

    if (!key) {
      return next(new AppError('API key is missing. Please provide x-api-key header.', 401));
    }

    // 1. Hash incoming key
    const hashedKey = hashKey(key);

    // 2. Locate API key in database and populate user details
    const apiKeyDoc = await ApiKey.findOne({ hashedKey, isActive: true }).populate('user');

    if (!apiKeyDoc) {
      return next(new AppError('Invalid or inactive API key.', 401));
    }

    // 3. Check expiration date if configured
    if (apiKeyDoc.expiresAt && apiKeyDoc.expiresAt < new Date()) {
      return next(new AppError('API key has expired.', 401));
    }

    // 4. Attach API key and associated user details to request
    req.apiKey = apiKeyDoc;
    req.user = apiKeyDoc.user;

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  apiKeyAuth,
  hashKey,
};
