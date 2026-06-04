const { body, param } = require('express-validator');

const userExpressValidator = {
  // Validate POST request
  createUser: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail()
  ],

  // Validate ID parameter for GET, PUT, DELETE
  validateId: [
    param('id')
      .trim()
      .isMongoId().withMessage('User ID must be a valid MongoDB ObjectId')
  ],

  // Validate PUT request
  updateUser: [
    param('id')
      .trim()
      .isMongoId().withMessage('User ID must be a valid MongoDB ObjectId'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    // Custom check: Ensure at least one field is provided for updates
    body().custom((value, { req }) => {
      if (!req.body.name && !req.body.email) {
        throw new Error('At least one field (name or email) must be provided for updates');
      }
      return true;
    })
  ]
};

module.exports = userExpressValidator;
