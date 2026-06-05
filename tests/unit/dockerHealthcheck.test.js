'use strict';

let http = require('http');
const EventEmitter = require('events');

jest.mock('http');

describe('Docker Native Health Check Script', () => {
  let mockRequest;
  let mockResponse;
  let mockExit;

  beforeEach(() => {
    jest.resetModules();
    http = require('http');
    jest.clearAllMocks();
    
    // Mock process.exit
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

    // Mock response stream
    mockResponse = new EventEmitter();
    mockResponse.statusCode = 200;

    // Mock request
    mockRequest = new EventEmitter();
    mockRequest.destroy = jest.fn();
    mockRequest.end = jest.fn();

    http.request.mockImplementation((options, callback) => {
      callback(mockResponse);
      return mockRequest;
    });
  });

  afterEach(() => {
    mockExit.mockRestore();
    jest.resetModules();
  });

  test('should exit 0 (healthy) when response status is 200 and body status is healthy', () => {
    // Run the health check script by requiring it
    require('../../scripts/docker-healthcheck');

    // Simulate returning healthy JSON response
    mockResponse.emit('data', JSON.stringify({ status: 'healthy' }));
    mockResponse.emit('end');

    expect(mockExit).toHaveBeenCalledWith(0);
  });

  test('should exit 1 (unhealthy) when response status is not 200', () => {
    mockResponse.statusCode = 503;
    require('../../scripts/docker-healthcheck');

    mockResponse.emit('data', JSON.stringify({ status: 'unhealthy' }));
    mockResponse.emit('end');

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test('should exit 1 (unhealthy) when request encounters socket error', () => {
    require('../../scripts/docker-healthcheck');

    mockRequest.emit('error', new Error('Connection refused'));

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test('should exit 1 (unhealthy) when request times out', () => {
    require('../../scripts/docker-healthcheck');

    mockRequest.emit('timeout');

    expect(mockRequest.destroy).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
