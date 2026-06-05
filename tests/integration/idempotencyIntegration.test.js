const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const User = require('../../src/models/userModel');
const { redisClient } = require('../../src/middlewares/v1/rateLimiter');

// Mock mongoose user model and jwt
jest.mock('../../src/models/userModel');
jest.mock('jsonwebtoken');

describe('Idempotency Middleware Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should pass through GET requests even if idempotency key is supplied', async () => {
    jwt.verify.mockReturnValue({ id: 'admin123' });
    User.findById.mockResolvedValue({ _id: 'admin123', name: 'Admin User', role: 'admin' });
    User.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', 'Bearer validtoken')
      .set('Idempotency-Key', 'get-request-key-123');

    expect(response.status).toBe(200);
    // Header should not be present on GET requests
    expect(response.headers['x-cache-idempotency']).toBeUndefined();
  });

  test('should execute first mutating call as MISS and save results in Redis', async () => {
    jwt.verify.mockReturnValue({ id: 'admin123' });
    User.findById.mockResolvedValue({ _id: 'admin123', name: 'Admin', role: 'admin' });
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: 'newuser123', name: 'Idempotent User', email: 'idem@example.com' });

    // Ensure Redis has no cache initially
    jest.spyOn(redisClient, 'get').mockResolvedValue(null);
    const setSpy = jest.spyOn(redisClient, 'set').mockResolvedValue('OK');

    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', 'Bearer validtoken')
      .set('Idempotency-Key', 'post-unique-key-999')
      .send({ name: 'Idempotent User', email: 'idem@example.com' });

    expect(response.status).toBe(201);
    expect(response.headers['x-cache-idempotency']).toBe('MISS');
    expect(response.body.name).toBe('Idempotent User');

    // Confirm that the middleware saved the response to Redis
    expect(setSpy).toHaveBeenCalledWith(
      'idempotency:post-unique-key-999',
      expect.stringContaining('"status":201'),
      'EX',
      86400
    );
  });

  test('should return cached response and bypass DB logic on second request with same key (HIT)', async () => {
    jwt.verify.mockReturnValue({ id: 'admin123' });
    User.findById.mockResolvedValue({ _id: 'admin123', name: 'Admin', role: 'admin' });

    // Mock Redis returning a previously cached response
    const cachedResponsePayload = JSON.stringify({
      status: 201,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ _id: 'newuser123', name: 'Idempotent User', email: 'idem@example.com' }),
    });

    jest.spyOn(redisClient, 'get').mockResolvedValue(cachedResponsePayload);

    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', 'Bearer validtoken')
      .set('Idempotency-Key', 'post-unique-key-999')
      .send({ name: 'Idempotent User', email: 'idem@example.com' });

    expect(response.status).toBe(201);
    expect(response.headers['x-cache-idempotency']).toBe('HIT');
    expect(response.body.name).toBe('Idempotent User');

    // Confirm that the database creation call was bypassed
    expect(User.create).not.toHaveBeenCalled();
  });
});
