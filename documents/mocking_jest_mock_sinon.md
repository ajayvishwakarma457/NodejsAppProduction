# Mocking: jest.mock vs Sinon

This document outlines the industry standards for mocking in modern Node.js application test suites, comparing the built-in capabilities of **Jest Mocking** (`jest.mock`, `jest.fn`, `jest.spyOn`) against **Sinon.js**, and detailing our implementation.

---

## 1. Industry Standard Comparison

| Feature / Criteria | Jest Mocks (`jest.mock`) | Sinon.js (`sinon`) |
| :--- | :--- | :--- |
| **Ecosystem Fit** | **Native**. Built directly into Jest; requires zero configuration or additional packages. | **External Library**. Requires installation and importing (`npm install sinon`). |
| **Scope of Mocking** | **Module-Level Interception**. Can mock third-party dependencies and built-ins globally before test files are evaluated. | **Object-Property Stubbing**. Stubs and spies on properties of objects that are already loaded in memory. Struggles with ES Modules imports. |
| **Integration** | Seamless typing integration when using TypeScript and IDEs. | Requires custom setup or plugins to work smoothly with Jest's runtime environment. |
| **Use Case Recommendation** | **Recommended (Industry Standard)** when using Jest. | Recommended for non-Jest runners like **Mocha**, **Ava**, or **Tap** which lack native mocking. |

---

## 2. Mocking Capabilities in Jest

When writing tests in Jest, there are three primary mock mechanisms:

1. **`jest.mock(modulePath, factory)`**: Replaces the entire module with mock functions. Great for mocking third-party libraries (e.g. `@aws-sdk/client-s3`, `ioredis`) or native node modules (e.g., `fs`).
2. **`jest.spyOn(object, methodName)`**: Spies on or stubs a specific method on an object while keeping the rest of the original object structure intact.
3. **`jest.fn()`**: Creates a standalone, empty mock function to track calls, arguments, and return values (ideal for passing as mock callback arguments like Express's `next` function).

---

## 3. Practical Implementation: `s3Service` Test Suite

We implemented mock tests for [s3Service.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/utils/s3Service.js) in [s3Service.test.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/tests/unit/s3Service.test.js) to demonstrate robust module mocking.

### Mocking Built-ins (`fs`) and SDKs (`@aws-sdk/client-s3`)

```javascript
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// 1. Mock the file system module globally
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    writeFile: jest.fn(),
  },
}));

// 2. Mock the AWS S3 client & commands
jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: jest.fn(),
  };
});
```

### Isolating Test Environments

To test different environment flags (such as mock fallback storage vs AWS S3 storage), we isolate module caching:

```javascript
describe('s3Service Unit Tests with jest.mock', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();      // Clear historical calls on mocked functions
    jest.resetModules();       // Clear cache to allow re-evaluation of module constants
    process.env = { ...originalEnv };
  });

  test('should save file locally when S3 is in mock mode', async () => {
    process.env.AWS_ACCESS_KEY_ID = 'mock-access-key-id';
    
    const s3Service = require('../../src/utils/s3Service');
    const localFs = require('fs');

    localFs.existsSync.mockReturnValue(false);
    localFs.promises.writeFile.mockResolvedValue(undefined);

    const result = await s3Service.uploadToS3(mockFile);

    expect(localFs.existsSync).toHaveBeenCalled();
    expect(result.storageType).toBe('mock-s3-local-fallback');
  });
});
```

---

## 4. Key Best Practices for Jest Mocking

1. **Clear Between Tests**: Always clean mock histories using `jest.clearAllMocks()` in `beforeEach` to prevent test-pollution (e.g. call counters carrying over).
2. **Mocking Globals**: Use `jest.mock` at the very top of your test spec file. Jest automatically hoists `jest.mock` calls to the top of the file, ensuring dependencies are intercepted immediately.
3. **Use Mock-Reset for Configs**: When testing code that parses `process.env` at file loading time, reset module registries using `jest.resetModules()` before requiring modules dynamically within tests.
