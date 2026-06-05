const correlationIdMiddleware = require('../../src/middlewares/v1/correlationIdMiddleware');
const asyncLocalStorage = require('../../src/utils/tracer');

describe('correlationIdMiddleware Unit Tests', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
    };
    res = {
      setHeader: jest.fn(),
    };
    next = jest.fn();
  });

  test('should generate a correlation ID and run inside AsyncLocalStorage context when client does not provide one', () => {
    correlationIdMiddleware(req, res, () => {
      // Inside ALS store scope
      const store = asyncLocalStorage.getStore();
      
      expect(req.correlationId).toBeDefined();
      expect(typeof req.correlationId).toBe('string');
      expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', req.correlationId);
      expect(store).toBeDefined();
      expect(store.correlationId).toBe(req.correlationId);
      
      next();
    });

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('should reuse client-provided correlation ID if forwarded in headers', () => {
    const clientCid = 'test-client-correlation-id-12345';
    req.headers['x-correlation-id'] = clientCid;

    correlationIdMiddleware(req, res, () => {
      const store = asyncLocalStorage.getStore();
      
      expect(req.correlationId).toBe(clientCid);
      expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', clientCid);
      expect(store.correlationId).toBe(clientCid);
      
      next();
    });

    expect(next).toHaveBeenCalledTimes(1);
  });
});
