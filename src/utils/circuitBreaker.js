const CircuitBreaker = require('opossum');
const logger = require('./logger');

const defaultOptions = {
  timeout: 3000, // If the action takes longer than 3 seconds, count as failure
  errorThresholdPercentage: 50, // Trip if failure rate reaches 50%
  resetTimeout: 10000, // Wait 10 seconds before attempting recovery (Half-Open)
};

/**
 * Wraps an asynchronous action inside an Opossum Circuit Breaker
 * @param {Function} action - Async function returning a promise
 * @param {Object} options - Custom configuration overrides
 * @returns {CircuitBreaker} The configured CircuitBreaker instance
 */
const createCircuitBreaker = (action, options = {}) => {
  const breaker = new CircuitBreaker(action, { ...defaultOptions, ...options });

  breaker.on('fire', () => logger.debug('[Circuit Breaker] Action invoked.'));
  breaker.on('reject', () => logger.warn('[Circuit Breaker] Execution rejected - Circuit is currently OPEN!'));
  breaker.on('timeout', () => logger.error('[Circuit Breaker] Action timed out.'));
  breaker.on('open', () => logger.error('[Circuit Breaker] STATUS TRANSITION: CLOSED -> OPEN (Tripped)'));
  breaker.on('close', () => logger.info('[Circuit Breaker] STATUS TRANSITION: OPEN/HALF-OPEN -> CLOSED (Recovered)'));
  breaker.on('halfOpen', () => logger.info('[Circuit Breaker] STATUS TRANSITION: OPEN -> HALF-OPEN (Testing downstream...)'));

  return breaker;
};

module.exports = createCircuitBreaker;
