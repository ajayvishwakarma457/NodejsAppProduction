const request = require('supertest');
const app = require('../../src/app');

describe('Swagger Documentation API Integration Tests', () => {
  test('should return 200 OK and serve Swagger UI html at /api-docs/', async () => {
    // Note: swagger-ui-express serves documentation at /api-docs/ (with trailing slash)
    // and redirects /api-docs to /api-docs/
    const response = await request(app).get('/api-docs/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('<div id="swagger-ui">');
    expect(response.text).toContain('swagger-ui-bundle.js');
  });

  test('should redirect /api-docs to /api-docs/', async () => {
    const response = await request(app).get('/api-docs');
    
    // Redirect statuses (301 or 302)
    expect([301, 302]).toContain(response.status);
    expect(response.headers.location).toContain('/api-docs/');
  });
});
