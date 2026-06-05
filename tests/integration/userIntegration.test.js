const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const User = require('../../src/models/userModel');

// Mock mongoose user model and jwt
jest.mock('../../src/models/userModel');
jest.mock('jsonwebtoken');

describe('User API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/users', () => {
    test('should return 401 if request is unauthenticated', async () => {
      const response = await request(app).get('/api/v1/users');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Authentication required');
    });

    test('should return 403 if user is authenticated but does not have permission (not admin/moderator)', async () => {
      jwt.verify.mockReturnValue({ id: 'user123' });
      User.findById.mockResolvedValue({
        _id: 'user123',
        name: 'Normal User',
        role: 'user', // not admin or moderator
      });

      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer validtoken');

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('do not have permission');
    });

    test('should return 200 and users list if authenticated as admin', async () => {
      jwt.verify.mockReturnValue({ id: 'admin123' });
      User.findById.mockResolvedValue({
        _id: 'admin123',
        name: 'Admin User',
        role: 'admin',
      });
      User.find.mockResolvedValue([
        { name: 'User One', email: 'userone@example.com' },
        { name: 'User Two', email: 'usertwo@example.com' },
      ]);

      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer validtoken');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe('POST /api/v1/users', () => {
    test('should return 400 with Zod errors if body name/email is invalid', async () => {
      jwt.verify.mockReturnValue({ id: 'user123' });
      User.findById.mockResolvedValue({ _id: 'user123', name: 'User', role: 'user' });

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', 'Bearer validtoken')
        .send({
          name: 'A', // Too short, min 2
          email: 'invalidemail', // Invalid email
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toContain('Validation failed');
    });

    test('should return 201 on successfully creating a user', async () => {
      jwt.verify.mockReturnValue({ id: 'user123' });
      User.findById.mockResolvedValue({ _id: 'user123', name: 'User', role: 'user' });
      User.findOne.mockResolvedValue(null); // No existing duplicate email
      
      User.create.mockResolvedValue({
        _id: 'newuser123',
        name: 'Valid Name',
        email: 'validemail@example.com',
      });

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', 'Bearer validtoken')
        .send({
          name: 'Valid Name',
          email: 'validemail@example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        _id: 'newuser123',
        name: 'Valid Name',
        email: 'validemail@example.com',
      });
    });
  });
});
