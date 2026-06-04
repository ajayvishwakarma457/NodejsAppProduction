const AppError = require('../../utils/AppError');

/**
 * Generic request validation middleware using Zod schemas
 * Supports validation of body, query, and params
 */
const validateRequest = (schema) => (req, res, next) => {
  try {
    // Validate request object against schema
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    
    // Assign validated and parsed data back to request object
    req.body = parsed.body;
    req.query = parsed.query;
    req.params = parsed.params;
    
    next();
  } catch (error) {
    // If it's a Zod validation error, pass custom error details
    if (error.name === 'ZodError') {
      const messages = error.issues.map(err => `${err.path.slice(1).join('.')}: ${err.message}`);
      const valError = new AppError(`Validation failed: ${messages.join(', ')}`, 400);
      valError.errors = error.issues; // attach raw issues list
      return next(valError);
    }
    next(error);
  }
};

module.exports = validateRequest;
