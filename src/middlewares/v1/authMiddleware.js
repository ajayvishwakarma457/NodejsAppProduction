const jwt = require('jsonwebtoken');
const User = require('../../models/userModel');
const AppError = require('../../utils/AppError');

const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Get token from authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
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

module.exports = {
  protect,
};
