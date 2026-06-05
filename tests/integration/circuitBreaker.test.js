const createCircuitBreaker = require('../../src/utils/circuitBreaker');

describe('Circuit Breaker Pattern Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return normal response when downstream is healthy (Closed state)', async () => {
    const action = jest.fn().mockResolvedValue('healthy_response');
    const breaker = createCircuitBreaker(action);

    const result = await breaker.fire();
    expect(result).toBe('healthy_response');
    expect(action).toHaveBeenCalledTimes(1);
    expect(breaker.opened).toBe(false);
  });

  test('should fail-fast and execute fallback when circuit trips to Open state', async () => {
    const errorMsg = 'downstream service crash';
    const action = jest.fn().mockRejectedValue(new Error(errorMsg));
    
    // Create a breaker that trips on a single failure for testing
    const breaker = createCircuitBreaker(action, {
      errorThresholdPercentage: 1,
      rollingCountTimeout: 1000,
      rollingCountBuckets: 1,
    });

    breaker.fallback(() => 'fallback_response');

    // 1. First request fails
    try {
      await breaker.fire();
    } catch (err) {
      expect(err.message).toBe(errorMsg);
    }

    // Give it a tiny moment to process stats and open the circuit
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 2. Second request should hit fallback instantly without calling action again
    const fallbackResult = await breaker.fire();
    expect(fallbackResult).toBe('fallback_response');
    expect(action).toHaveBeenCalledTimes(1); // called only once!
    expect(breaker.opened).toBe(true);
  });
});
