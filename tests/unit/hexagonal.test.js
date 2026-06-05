'use strict';

const UserEntity = require('../../src/domain/userEntity');
const HexUserService = require('../../src/services/hexUserService');
const container = require('../../src/config/container');

describe('Hexagonal Architecture Unit Tests', () => {
  describe('Domain Entity Isolation', () => {
    it('should successfully instantiate UserEntity with core business logic', () => {
      const user = new UserEntity({
        id: '123',
        name: 'Hexagon User',
        email: 'hexagon@example.com',
        role: 'user'
      });

      expect(user.isAdmin()).toBe(false);
      expect(user.status).toBe('active');
      
      user.deactivate();
      expect(user.status).toBe('inactive');
    });

    it('should validate domain entity boundaries correctly', () => {
      const invalidNameUser = new UserEntity({
        email: 'invalid@example.com'
      });
      expect(() => invalidNameUser.validate()).toThrow('User name cannot be empty');

      const invalidEmailUser = new UserEntity({
        name: 'Valid Name',
        email: 'invalidemail'
      });
      expect(() => invalidEmailUser.validate()).toThrow('User email must be a valid email address');
    });
  });

  describe('Application Service Orchestration via Ports', () => {
    it('should use Outbound Port Mock to save core UserEntity without DB requirements', async () => {
      // Mock outbound driven repository port satisfying port signatures
      const mockUserRepositoryPort = {
        findByEmail: jest.fn().mockResolvedValueOnce(null),
        save: jest.fn().mockImplementationOnce((user) => Promise.resolve(user))
      };
      
      const mockLogger = {
        info: jest.fn()
      };

      const hexService = new HexUserService({
        userRepositoryPort: mockUserRepositoryPort,
        logger: mockLogger
      });

      const userData = { name: 'Hex Core', email: 'hex@example.com', role: 'admin' };
      const savedUser = await hexService.createUser(userData);

      expect(savedUser.email).toBe('hex@example.com');
      expect(savedUser.isAdmin()).toBe(true);
      expect(mockUserRepositoryPort.findByEmail).toHaveBeenCalledWith('hex@example.com');
      expect(mockUserRepositoryPort.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('Container Resolution & Adapters Binding', () => {
    it('should resolve hexUserService and satisfy port binding adapter configs', () => {
      const hexService = container.resolve('hexUserService');
      expect(hexService).toBeDefined();
      expect(hexService.userRepositoryPort).toBeDefined();
      expect(typeof hexService.userRepositoryPort.save).toBe('function');
    });
  });
});
