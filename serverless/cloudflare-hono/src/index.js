// serverless/cloudflare-hono/src/index.js
const { Hono } = require('hono');
const { cors } = require('hono/cors');
const { logger } = require('hono/logger');

const app = new Hono();

// Global Middleware
app.use('*', logger());
app.use('*', cors());

// Error handler
app.onError((err, c) => {
  console.error(`Edge Router Error: ${err.message}`);
  return c.json({
    success: false,
    error: 'Internal Edge Error',
    message: err.message,
  }, 500);
});

// Custom response header middleware
app.use('*', async (c, next) => {
  await next();
  c.header('x-edge-powered-by', 'Hono-Cloudflare-Worker');
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    environment: c.env?.ENVIRONMENT || 'development',
    version: c.env?.API_VERSION || 'v1',
    timestamp: new Date().toISOString(),
  });
});

// Demo profile endpoint returning mock edge-computed payload
app.get('/api/edge/info', (c) => {
  const userAgent = c.req.header('user-agent') || 'unknown';
  const ipAddress = c.req.header('cf-connecting-ip') || '127.0.0.1';
  
  return c.json({
    message: 'Hello from Cloudflare Workers at the Edge!',
    client: {
      ip: ipAddress,
      userAgent: userAgent,
    },
    honoVersion: 'v4.x',
  });
});

// Endpoint for testing global error boundary
app.get('/api/edge/error-test', (c) => {
  throw new Error('Simulation Failure');
});

module.exports = app;
