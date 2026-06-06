// tests/unit/awsLambda.test.js
'use strict';

const mongoose = require('mongoose');
const { apiHandler } = require('../../serverless/aws-lambda/handler');

// Mock mongoose connection behaviors
jest.mock('mongoose', () => {
  let isConnected = false;
  return {
    connect: jest.fn().mockImplementation(async () => {
      isConnected = true;
      return { readyState: 1 };
    }),
    connection: {
      get readyState() {
        return isConnected ? 1 : 0;
      }
    }
  };
});

describe('AWS Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a healthy response for /health and verify connection cache reuse', async () => {
    const event = {
      path: '/health',
      httpMethod: 'GET',
    };
    const context = {
      callbackWaitsForEmptyEventLoop: true,
    };

    // 1. First invocation (Cold Start)
    const response1 = await apiHandler(event, context);
    expect(response1.statusCode).toBe(200);
    const body1 = JSON.parse(response1.body);
    expect(body1.status).toBe('healthy');
    expect(mongoose.connect).toHaveBeenCalledTimes(1);

    // 2. Second invocation (Warm Start - should reuse the connection without calling connect again)
    const response2 = await apiHandler(event, context);
    expect(response2.statusCode).toBe(200);
    expect(mongoose.connect).toHaveBeenCalledTimes(1); // Call count remains 1
  });

  it('should return default hello greeting for other paths', async () => {
    const event = {
      path: '/some-endpoint',
      httpMethod: 'POST',
    };
    const context = {};

    const response = await apiHandler(event, context);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Hello from AWS Lambda!');
    expect(body.path).toBe('/some-endpoint');
    expect(body.method).toBe('POST');
  });
});
