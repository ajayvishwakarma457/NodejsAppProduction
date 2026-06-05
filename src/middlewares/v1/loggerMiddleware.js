const logger = require('../../utils/logger');

// Custom logger middleware
const loggerMiddleware = (req, res, next) => {
  logger.http(`${req.method} ${req.originalUrl}`);
  next(); // pass control to the next handler
};

module.exports = loggerMiddleware;
