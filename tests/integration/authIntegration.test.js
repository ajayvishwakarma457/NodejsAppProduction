const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/userModel');
const RefreshToken = require('../../src/models/refreshTokenModel');

// Mock mongoose models
jest.mock('../../src/models/userModel');
jest.mock('../../src/models/refreshTokenModel');

describe('Auth API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    test('should return 400 if name, email or password are missing', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        }); // name is missing

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Please provide name, email, and password');
    });

    test('should return 400 if user with the same email already exists', async () => {
      User.findOne.mockResolvedValue({ email: 'duplicate@example.com' });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Existing User',
          email: 'duplicate@example.com',
          password: 'Password123!',
        });

      expect(User.findOne).toHaveBeenCalledWith({ email: 'duplicate@example.com' });
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('email already exists');
    });

    test('should return 201 and tokens on successful registration', async () => {
      User.findOne.mockResolvedValue(null); // No duplicate
      const mockCreatedUser = {
        _id: 'mockuserid123',
        name: 'New User',
        email: 'newuser@example.com',
      };
      
      User.create.mockResolvedValue([mockCreatedUser]); // Mock create callback
      RefreshToken.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user).toEqual({
        id: 'mockuserid123',
        name: 'New User',
        email: 'newuser@example.com',
      });
    });
  });
});
