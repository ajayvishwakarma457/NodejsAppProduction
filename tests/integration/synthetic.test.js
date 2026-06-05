'use strict';

const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');
const axios = require('axios');
const { register } = require('../../src/utils/metrics');
const syntheticProber = require('../../src/utils/syntheticProber');

jest.mock('axios');

describe('Synthetic Monitoring & Uptime Checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    register.resetMetrics();
  });

  describe('GET /health', () => {
    test('should return 200 and healthy payload when db and redis are connected', async () => {
      // Mock mongoose readyState
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', {
        get: () => 1, // connected
        configurable: true,
      });

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body.services.database.healthy).toBe(true);
      expect(response.body.services.cache.healthy).toBe(true); // mocked sessionRedisClient defaults to ready

      // Restore
      Object.defineProperty(mongoose.connection, 'readyState', {
        get: () => originalReadyState,
        configurable: true,
      });
    });

    test('should return 503 and unhealthy payload when database is disconnected', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', {
        get: () => 0, // disconnected
        configurable: true,
      });

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body.services.database.healthy).toBe(false);

      Object.defineProperty(mongoose.connection, 'readyState', {
        get: () => originalReadyState,
        configurable: true,
      });
    });
  });

  describe('SyntheticProber Utility', () => {
    test('should probe target and set prometheus metrics on success', async () => {
      axios.get.mockResolvedValue({ status: 200 });

      // Run one-off probe
      await syntheticProber.probe();

      const metricsString = await register.metrics();
      expect(metricsString).toContain('synthetic_probe_success');
      expect(metricsString).toContain('synthetic_probe_duration_seconds');
      
      // The metric value for the target should be 1 (success)
      const successMetric = await register.getSingleMetric('synthetic_probe_success').get();
      const targetMetric = successMetric.values.find(
        v => v.labels.target === 'http://localhost:5000/health' && v.labels.status_code === '200'
      );
      expect(targetMetric).toBeDefined();
      expect(targetMetric.value).toBe(1);
    });

    test('should set metric to 0 and log when probe fails', async () => {
      axios.get.mockRejectedValue(new Error('Connection refused'));

      await syntheticProber.probe();

      const successMetric = await register.getSingleMetric('synthetic_probe_success').get();
      const targetMetric = successMetric.values.find(
        v => v.labels.target === 'http://localhost:5000/health' && v.labels.status_code === 'UNKNOWN'
      );
      expect(targetMetric).toBeDefined();
      expect(targetMetric.value).toBe(0);
    });
  });
});
