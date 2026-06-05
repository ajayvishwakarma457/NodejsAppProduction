const jwt = require('jsonwebtoken');
const { protect } = require('../../src/middlewares/v1/authMiddleware');
const User = require('../../src/models/userModel');
const AppError = require('../../src/utils/AppError');

// 1. Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../src/models/userModel');

describe('authMiddleware protect Unit Tests', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {},
      query: {},
    };
    res = {};
    next = jest.fn();
  });

  test('should call next with AppError if no token is provided in headers or query', async () => {
    await protect(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errorPassed = next.mock.calls[0][0];
    expect(errorPassed).toBeInstanceOf(AppError);
    expect(errorPassed.statusCode).toBe(401);
    expect(errorPassed.message).toContain('You are not logged in');
  });

  test('should call next with AppError if JWT verification fails', async () => {
    req.headers.authorization = 'Bearer invalidtoken';
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });

    await protect(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errorPassed = next.mock.calls[0][0];
    expect(errorPassed).toBeInstanceOf(AppError);
    expect(errorPassed.statusCode).toBe(401);
    expect(errorPassed.message).toContain('Invalid token');
  });

  test('should call next with AppError if token is expired', async () => {
    req.headers.authorization = 'Bearer expiredtoken';
    jwt.verify.mockImplementation(() => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      throw err;
    });

    await protect(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errorPassed = next.mock.calls[0][0];
    expect(errorPassed).toBeInstanceOf(AppError);
    expect(errorPassed.statusCode).toBe(401);
    expect(errorPassed.message).toContain('token has expired');
  });

  test('should call next with AppError if the user belonging to the token no longer exists', async () => {
    req.headers.authorization = 'Bearer validtoken';
    jwt.verify.mockReturnValue({ id: 'mockuser123' });
    User.findById.mockResolvedValue(null); // Database returns null

    await protect(req, res, next);

    expect(User.findById).toHaveBeenCalledWith('mockuser123');
    expect(next).toHaveBeenCalledTimes(1);
    const errorPassed = next.mock.calls[0][0];
    expect(errorPassed).toBeInstanceOf(AppError);
    expect(errorPassed.statusCode).toBe(401);
    expect(errorPassed.message).toContain('no longer exists');
  });

  test('should attach user to req and call next if authorization header is valid and user exists', async () => {
    req.headers.authorization = 'Bearer validtoken';
    const mockUser = {
      _id: 'mockuser123',
      name: 'Test User',
      email: 'test@example.com',
    };
    jwt.verify.mockReturnValue({ id: 'mockuser123' });
    User.findById.mockResolvedValue(mockUser);

    await protect(req, res, next);

    expect(User.findById).toHaveBeenCalledWith('mockuser123');
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // called with no errors
  });

  test('should extract token from query param and successfully authenticate', async () => {
    req.query.token = 'validquerytoken';
    const mockUser = {
      _id: 'mockuser123',
      name: 'Test User',
      email: 'test@example.com',
    };
    jwt.verify.mockReturnValue({ id: 'mockuser123' });
    User.findById.mockResolvedValue(mockUser);

    await protect(req, res, next);

    expect(User.findById).toHaveBeenCalledWith('mockuser123');
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // called with no errors
  });
});
