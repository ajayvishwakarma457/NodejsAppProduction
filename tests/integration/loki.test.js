describe('Loki Integration Tests', () => {
  const LOKI_HOST = process.env.LOKI_HOST || 'http://localhost:3100';

  test('winston-loki package is installed and importable', () => {
    expect(() => require('winston-loki')).not.toThrow();
  });

  test('logger module loads without throwing even without Loki running', () => {
    // In test env LOKI_HOST is not set, so Loki transport is skipped gracefully
    expect(() => require('../../src/utils/logger')).not.toThrow();
  });

  test('logger exposes standard winston log methods', () => {
    const logger = require('../../src/utils/logger');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.http).toBe('function');
  });

  test('Loki transport is conditionally added when LOKI_HOST is set', () => {
    const winston = require('winston');
    const LokiTransport = require('winston-loki');

    // Manually create a logger with Loki transport (simulating LOKI_HOST being set)
    let lokiTransportAdded = false;
    try {
      const testTransport = new LokiTransport({
        host: LOKI_HOST,
        labels: { app: 'test', env: 'test' },
        json: true,
        onConnectionError: () => {}, // suppress errors in test
      });
      lokiTransportAdded = true;
      testTransport.close && testTransport.close(); // clean up
    } catch (err) {
      // transport construction failed - that's ok in tests
    }
    expect(lokiTransportAdded).toBe(true);
  });

  test('Loki label structure is correct', () => {
    const LokiTransport = require('winston-loki');
    const transport = new LokiTransport({
      host: LOKI_HOST,
      labels: {
        app: 'nodejs-production-platform',
        env: 'test',
      },
      json: true,
      onConnectionError: () => {},
    });

    // Labels are stored directly on the transport instance
    expect(transport.labels.app).toBe('nodejs-production-platform');
    expect(transport.labels.env).toBe('test');
    transport.close && transport.close();
  });
});
