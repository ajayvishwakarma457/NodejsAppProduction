'use strict';

const container = require('../../src/config/container');
const DiUserService = require('../../src/services/diUserService');

describe('Dependency Injection Container Tests', () => {
  it('should successfully resolve logger from the container', () => {
    const logger = container.resolve('logger');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('should successfully resolve userModel from the container', () => {
    const userModel = container.resolve('userModel');
    expect(userModel).toBeDefined();
    expect(userModel.modelName).toBe('User');
  });

  it('should resolve diUserService as a singleton instance', () => {
    const service1 = container.resolve('diUserService');
    const service2 = container.resolve('diUserService');
    expect(service1).toBeInstanceOf(DiUserService);
    expect(service1).toBe(service2); // Verify singleton behavior
  });

  it('should support manual dependency injection for unit testing', async () => {
    // Mock userModel for testing without database connection
    const mockUserModel = {
      find: jest.fn().mockResolvedValueOnce([{ email: 'test@example.com' }]),
    };
    const mockLogger = {
      info: jest.fn(),
    };

    // Instantiate class manually passing mocked objects in constructor
    const service = new DiUserService({
      userModel: mockUserModel,
      logger: mockLogger,
    });

    const result = await service.getAllUsers();
    expect(result).toEqual([{ email: 'test@example.com' }]);
    expect(mockUserModel.find).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith('[DI Service] Retrieving all users from database');
  });
});
