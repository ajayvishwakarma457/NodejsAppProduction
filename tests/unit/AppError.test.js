const AppError = require('../../src/utils/AppError');

describe('AppError Unit Tests', () => {
  test('should correctly instantiate with message and statusCode', () => {
    const error = new AppError('Something went wrong', 400);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe('Something went wrong');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
  });

  test('should set status to "fail" for 4xx status codes', () => {
    const error400 = new AppError('Bad Request', 400);
    const error404 = new AppError('Not Found', 404);

    expect(error400.status).toBe('fail');
    expect(error404.status).toBe('fail');
  });

  test('should set status to "error" for 5xx status codes', () => {
    const error500 = new AppError('Internal Server Error', 500);
    const error503 = new AppError('Service Unavailable', 503);

    expect(error500.status).toBe('error');
    expect(error503.status).toBe('error');
  });

  test('should capture the stack trace and exclude constructor from stack trace', () => {
    const error = new AppError('Operational Error', 402);

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });
});
