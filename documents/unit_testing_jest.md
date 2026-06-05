# Unit Testing with Jest

This document details the configuration and implementation of unit testing using **Jest** in our production Node.js application.

---

## 1. What is Jest?

Jest is a delightful JavaScript Testing Framework with a focus on simplicity. It is the dominant industry standard for Node.js backends. Jest handles test discovery, assertion execution, sandbox mocking, and test coverage generation out-of-the-box.

---

## 2. Configuration (`jest.config.js`)

We created a centralized configuration file to govern Jest executions:

```javascript
module.exports = {
  testEnvironment: 'node',      // Use Node environment for testing backend services
  clearMocks: true,             // Clear mock call states before each test run
  restoreMocks: true,           // Restore module mocks back to original behavior
  coverageDirectory: 'coverage', // Output directory for coverage data files
  collectCoverageFrom: [        // Select source code targets for coverage reports
    'src/**/*.js',
    '!src/server.js',
    '!src/app.js',
    '!src/config/*.js',
  ],
  testMatch: [
    '**/tests/**/*.test.js',    // Location where test specs are scanned
  ],
};
```

---

## 3. Mocking Methodology in Jest

In unit testing, we isolate the component under test from external resources (like databases or third-party APIs). We do this by replacing dependencies with mock implementations.

We demonstrated this in [authMiddleware.test.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/tests/unit/authMiddleware.test.js) by mocking the mongoose database model and the `jsonwebtoken` module:

```javascript
const jwt = require('jsonwebtoken');
const User = require('../../src/models/userModel');

// Replaces all module exports with Jest mock functions
jest.mock('jsonwebtoken');
jest.mock('../../src/models/userModel');

describe('authMiddleware protect Unit Tests', () => {
  test('should attach user to req and call next', async () => {
    // Inject mock return values
    jwt.verify.mockReturnValue({ id: 'mockuser123' });
    User.findById.mockResolvedValue({ _id: 'mockuser123', name: 'Test User' });

    await protect(req, res, next);

    expect(User.findById).toHaveBeenCalledWith('mockuser123');
    expect(req.user.name).toBe('Test User');
    expect(next).toHaveBeenCalledWith(); // success block
  });
});
```

---

## 4. Execution Commands

The following scripts are registered in `package.json` for daily testing workflows:

### Run All Tests
Runs test files matching the configuration patterns:
```bash
npm test
```

### Active Test Watch Mode
Watches files for changes and re-runs relevant tests automatically:
```bash
npm run test:watch
```

### Coverage Reports
Runs tests and outputs detailed code coverage metrics to the console and compiles HTML reports in `/coverage/`:
```bash
npm run test:coverage
```
