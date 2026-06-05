'use strict';

const container = require('../../src/config/container');
const DiUserService = require('../../src/services/diUserService');

describe('Dependency Injection Container Tests', () => {
  it('should successfully resolve logger from the container', () => {
    const logger = container.resolve('logger');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('should successfully resolve userRepository from the container', () => {
    const userRepository = container.resolve('userRepository');
    expect(userRepository).toBeDefined();
    expect(typeof userRepository.findAll).toBe('function');
  });

  it('should resolve diUserService as a singleton instance', () => {
    const service1 = container.resolve('diUserService');
    const service2 = container.resolve('diUserService');
    expect(service1).toBeInstanceOf(DiUserService);
    expect(service1).toBe(service2);
  });

  it('should support manual dependency injection for unit testing with repository', async () => {
    // Mock userRepository for testing service logic
    const mockUserRepository = {
      findAll: jest.fn().mockResolvedValueOnce([{ email: 'test@example.com' }]),
    };
    const mockLogger = {
      info: jest.fn(),
    };

    // Instantiate class manually passing mocked objects in constructor
    const service = new DiUserService({
      userRepository: mockUserRepository,
      logger: mockLogger,
    });

    const result = await service.getAllUsers();
    expect(result).toEqual([{ email: 'test@example.com' }]);
    expect(mockUserRepository.findAll).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith('[DI Service] Retrieving all users from repository');
  });

  it('should test UserRepository calls Mongoose methods correctly', async () => {
    const UserRepository = require('../../src/repositories/userRepository');
    const mockUserModel = {
      find: jest.fn().mockResolvedValueOnce([{ email: 'test@example.com' }]),
    };
    const repository = new UserRepository({ userModel: mockUserModel });
    const result = await repository.findAll();
    expect(result).toEqual([{ email: 'test@example.com' }]);
    expect(mockUserModel.find).toHaveBeenCalledTimes(1);
  });
});
