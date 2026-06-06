// tests/unit/vercelEdge.test.js
'use strict';

const handler = require('../../serverless/vercel-edge/api/edge-handler');

describe('Vercel Edge Function Handler', () => {
  it('should respond with a friendly message using query parameters', async () => {
    // Utilize Node.js global Web Request API
    const request = new Request('http://localhost/api/edge/greet?name=Ajay', {
      headers: {
        'x-forwarded-for': '1.1.1.1',
        'x-vercel-ip-country': 'IN',
      },
    });

    const response = await handler(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const body = await response.json();
    expect(body.message).toBe('Hello Ajay from Vercel Edge Functions!');
    expect(body.ip).toBe('1.1.1.1');
    expect(body.country).toBe('IN');
    expect(body.runtime).toBe('V8 Isolate');
  });

  it('should fall back to default guest if query name is missing', async () => {
    const request = new Request('http://localhost/api/edge/greet');
    const response = await handler(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Hello Guest from Vercel Edge Functions!');
  });
});
