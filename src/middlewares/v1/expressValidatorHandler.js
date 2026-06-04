const { validationResult } = require('express-validator');
const AppError = require('../../utils/AppError');

/**
 * Middleware that checks validation results from express-validator
 * and bubbles errors to the centralized error handler.
 */
const expressValidatorHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(err => `${err.path}: ${err.msg}`);
    const valError = new AppError(`Validation failed: ${messages.join(', ')}`, 400);
    valError.errors = errors.array(); // attach details
    return next(valError);
  }
  next();
};

module.exports = expressValidatorHandler;
