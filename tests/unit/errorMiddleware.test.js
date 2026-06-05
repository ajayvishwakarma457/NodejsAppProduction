const errorMiddleware = require('../../src/middlewares/v1/errorMiddleware');
const AppError = require('../../src/utils/AppError');
const logger = require('../../src/utils/logger');

// Mock Winston logger
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('errorMiddleware Unit Tests', () => {
  let req;
  let res;
  let next;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('should return complete error details including stack trace', () => {
      const err = new AppError('Something went wrong!', 400);
      err.stack = 'Mocked Error Stack';

      errorMiddleware(err, req, res, next);

      expect(logger.error).toHaveBeenCalledWith(err);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          message: 'Something went wrong!',
          stack: 'Mocked Error Stack',
        })
      );
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    test('should return friendly message for operational errors and log warning', () => {
      const err = new AppError('Operational error occurred', 404);

      errorMiddleware(err, req, res, next);

      expect(logger.warn).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Operational error occurred',
      });
    });

    test('should hide implementation details for non-operational errors and log error', () => {
      const err = new Error('Generic internal error');

      errorMiddleware(err, req, res, next);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Something went very wrong!',
      });
    });

    test('should translate CastError to a friendly 400 Bad Request error', () => {
      const err = new Error('Cast validation failed');
      err.name = 'CastError';
      err.path = 'id';
      err.value = 'invalid-mongo-id-123';

      errorMiddleware(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Invalid id: invalid-mongo-id-123.',
      });
    });

    test('should translate Duplicate Key Error 11000 to a friendly 400 Bad Request error', () => {
      const err = new Error('E11000 duplicate key error collection: index: email_1 dup key: { email: "dup@example.com" }');
      err.code = 11000;

      errorMiddleware(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Duplicate field value: "dup@example.com". Please use another value!',
      });
    });

    test('should translate ValidationError to a friendly 400 Bad Request error', () => {
      const err = new Error('Validation failed');
      err.name = 'ValidationError';
      err.errors = {
        name: { message: 'Name is required' },
        email: { message: 'Email must be valid' },
      };

      errorMiddleware(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Invalid input data: Name is required. Email must be valid',
      });
    });

    test('should translate JsonWebTokenError to a friendly 401 Unauthorized error', () => {
      const err = new Error('invalid signature');
      err.name = 'JsonWebTokenError';

      errorMiddleware(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Invalid authentication token. Please log in again!',
      });
    });

    test('should translate TokenExpiredError to a friendly 401 Unauthorized error', () => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';

      errorMiddleware(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Your session has expired. Please log in again!',
      });
    });
  });
});
