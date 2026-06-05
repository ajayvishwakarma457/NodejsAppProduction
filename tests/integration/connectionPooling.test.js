const mongoose = require('mongoose');
const connectDB = require('../../src/config/db');
const redisConfig = require('../../src/config/redisConfig');

describe('Connection Pooling Configuration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should pass connection pool parameters to mongoose connect option objects', async () => {
    // Spy on mongoose.connect method
    const connectSpy = jest.spyOn(mongoose, 'connect').mockResolvedValue({
      connection: { host: 'localhost' }
    });

    await connectDB();

    expect(connectSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        maxPoolSize: expect.any(Number),
        minPoolSize: expect.any(Number),
        socketTimeoutMS: expect.any(Number),
        serverSelectionTimeoutMS: expect.any(Number),
      })
    );

    connectSpy.mockRestore();
  });

  test('should expose optimized connection and reconnect parameters in redisConfig', () => {
    expect(redisConfig).toMatchObject({
      host: expect.any(String),
      port: expect.any(Number),
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      connectTimeout: 10000,
      keepAlive: 30000,
      reconnectOnError: expect.any(Function),
    });

    // Test error evaluation routine
    const shouldReconnect = redisConfig.reconnectOnError(new Error('READONLY error triggered'));
    expect(shouldReconnect).toBe(true);

    const shouldNotReconnect = redisConfig.reconnectOnError(new Error('Random connection error'));
    expect(shouldNotReconnect).toBe(false);
  });
});
