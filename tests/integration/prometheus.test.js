const request = require('supertest');
const app = require('../../src/app');

describe('Prometheus Metrics Integration Tests', () => {
  test('should expose /metrics endpoint with text/plain format', async () => {
    const res = await request(app)
      .get('/metrics')
      .expect(200);

    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('http_request_duration_seconds');
    expect(res.text).toContain('active_connections');
    expect(res.text).toContain('db_operations_total');
  });

  test('should track incoming HTTP requests in metrics', async () => {
    // Make a request to a sample route
    await request(app)
      .get('/api-docs/')
      .expect(200);

    // Fetch metrics to verify the request was counted
    const metricsRes = await request(app)
      .get('/metrics')
      .expect(200);

    // Verify it recorded the GET request to /api-docs (or matched route)
    expect(metricsRes.text).toContain('method="GET"');
    expect(metricsRes.text).toContain('status_code="200"');
  });
});
