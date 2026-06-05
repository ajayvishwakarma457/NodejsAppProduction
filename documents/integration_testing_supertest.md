# Integration & API Testing with Supertest

This document details the configuration and implementation of integration tests for HTTP API endpoints using **Supertest** in our production Node.js application.

---

## 1. What is Supertest?

Supertest is a popular library for testing Node.js HTTP servers. It provides a high-level abstraction for testing HTTP requests, allowing you to pass the Express `app` instance directly to perform test assertions without binding the app to a real TCP port. This results in extremely fast, isolated test runs.

---

## 2. Testing Setup (`tests/setup.js`)

To prevent Jest from hanging and to run tests without requiring a real, running Redis server, we globally mock `ioredis` in `tests/setup.js`:

```javascript
// Mock ioredis globally to prevent actual connections during tests
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn(),
      call: jest.fn().mockResolvedValue(0), // Support rate-limit redis store call commands
      defineCommand: jest.fn(),
    };
  });
});
```

We configure Jest to load this setup file in [jest.config.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/jest.config.js):

```javascript
setupFiles: ['<rootDir>/tests/setup.js']
```

---

## 3. Writing Integration Tests

### A. Testing Public Routes & Controller Validation
In [authIntegration.test.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/tests/integration/authIntegration.test.js), we test the `/register` endpoint's response code and payload formatting:

```javascript
const request = require('supertest');
const app = require('../../src/app');

describe('POST /api/v1/auth/register', () => {
  test('should return 400 if name is missing', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
      });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('fail');
    expect(response.body.message).toContain('Please provide name');
  });
});
```

### B. Testing Protected Routes & Zod Schema Validation
In [userIntegration.test.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/tests/integration/userIntegration.test.js), we test RBAC permissions and Zod request body schemas:

```javascript
describe('POST /api/v1/users', () => {
  test('should return 400 with Zod errors if body name/email is invalid', async () => {
    jwt.verify.mockReturnValue({ id: 'user123' });
    User.findById.mockResolvedValue({ _id: 'user123', name: 'User', role: 'user' });

    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', 'Bearer validtoken')
      .send({
        name: 'A', // Too short (min 2)
        email: 'invalidemail',
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined(); // Contains Zod schema validation errors
  });
});
```

---

## 4. Execution Commands

### Run All Tests (Unit & Integration)
```bash
npm test
```

### Run Coverage Report
```bash
npm run test:coverage
```
