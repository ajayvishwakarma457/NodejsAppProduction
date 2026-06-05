// Set test environment variables
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.SESSION_SECRET = 'test_session_secret';
process.env.NODE_ENV = 'test';

jest.mock('ioredis');

// Mock mongoose globally to support offline transaction testing and prevent database connections
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue(true),
    startSession: jest.fn().mockResolvedValue(mockSession),
  };
});

// Mock bullmq globally to prevent background worker/queue tasks from connecting to Redis
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => {
      return {
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id-123' }),
        close: jest.fn().mockResolvedValue(true),
        on: jest.fn(),
      };
    }),
    Worker: jest.fn().mockImplementation(() => {
      return {
        close: jest.fn().mockResolvedValue(true),
        on: jest.fn(),
      };
    }),
  };
});
