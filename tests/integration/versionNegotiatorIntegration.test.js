const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const User = require('../../src/models/userModel');

// Mock mongoose user model and jwt
jest.mock('../../src/models/userModel');
jest.mock('jsonwebtoken');

describe('API Version Negotiator Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should route /api/users to /api/v1/users using default fallback (v1)', async () => {
    // Calling unversioned route should run through versionNegotiator, 
    // translate to /api/v1/users, and hit auth block returning 401 (proves route matched)
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication required');
  });

  test('should route /api/users?v=1 to /api/v1/users using query versioning', async () => {
    const response = await request(app).get('/api/users?v=1');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication required');
  });

  test('should route /api/users to /api/v1/users using X-API-Version header versioning', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('X-API-Version', '1');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication required');
  });

  test('should route /api/users to /api/v1/users using Accept header versioning', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Accept', 'application/vnd.production.v1+json');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication required');
  });
});
