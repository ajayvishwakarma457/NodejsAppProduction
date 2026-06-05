const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/userModel');

// Mock User model
jest.mock('../../src/models/userModel');

describe('Worker Threads Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should compute Fibonacci sequence successfully via Worker Thread', async () => {
    // Mock user lookup for authenticate middleware
    User.findById.mockResolvedValue({
      _id: 'user123',
      name: 'Test User',
      role: 'user'
    });

    const res = await request(app)
      .post('/api/v1/jobs/heavy-cpu')
      .set('Authorization', 'Bearer validtoken')
      .set('x-user-id', 'user123')
      .send({
        number: 10 // Fibonacci of 10 is 55
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.input).toBe(10);
    expect(res.body.data.result).toBe(55);
  });

  test('should return 400 if input number is missing', async () => {
    User.findById.mockResolvedValue({ _id: 'user123', role: 'user' });

    const res = await request(app)
      .post('/api/v1/jobs/heavy-cpu')
      .set('Authorization', 'Bearer validtoken')
      .set('x-user-id', 'user123')
      .send({}); // Empty body

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Please provide a "number"');
  });

  test('should return 400 if input number is negative', async () => {
    User.findById.mockResolvedValue({ _id: 'user123', role: 'user' });

    const res = await request(app)
      .post('/api/v1/jobs/heavy-cpu')
      .set('Authorization', 'Bearer validtoken')
      .set('x-user-id', 'user123')
      .send({ number: -5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('must be a non-negative integer');
  });
});
