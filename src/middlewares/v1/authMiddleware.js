const jwt = require('jsonwebtoken');
const User = require('../../models/userModel');
const AppError = require('../../utils/AppError');

const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Get token from authorization header or query param
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      // Check if there is dual prefixing
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    // 2. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Your token has expired. Please refresh your session.', 401));
      }
      return next(new AppError('Invalid token. Please log in again.', 401));
    }

    // 3. Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // 4. Grant access to protected route by attaching user to request
    req.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

const authenticate = async (req, res, next) => {
  const { apiKeyAuth } = require('./apiKeyMiddleware'); // avoid circular dependency if any

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  if (req.headers['x-api-key']) {
    return apiKeyAuth(req, res, next);
  }
  return next(new AppError('Authentication required. Provide Bearer JWT token or x-api-key header.', 401));
};

module.exports = {
  protect,
  restrictTo,
  authenticate,
};
