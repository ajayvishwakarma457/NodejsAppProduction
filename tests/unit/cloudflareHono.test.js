// tests/unit/cloudflareHono.test.js
'use strict';

const app = require('../../serverless/cloudflare-hono/src/index');

describe('Cloudflare Hono Edge Router', () => {
  it('should return health check details from /health', async () => {
    const env = {
      ENVIRONMENT: 'production',
      API_VERSION: 'v1'
    };

    const res = await app.request('/health', undefined, env);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-edge-powered-by')).toBe('Hono-Cloudflare-Worker');

    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.environment).toBe('production');
    expect(body.version).toBe('v1');
  });

  it('should return client details from /api/edge/info', async () => {
    const res = await app.request('/api/edge/info', {
      headers: {
        'User-Agent': 'Test-Agent',
        'cf-connecting-ip': '8.8.8.8'
      }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.client.userAgent).toBe('Test-Agent');
    expect(body.client.ip).toBe('8.8.8.8');
    expect(body.honoVersion).toBe('v4.x');
  });

  it('should trigger error handler on application failures', async () => {
    const res = await app.request('/api/edge/error-test');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Internal Edge Error');
    expect(body.message).toBe('Simulation Failure');
  });
});
