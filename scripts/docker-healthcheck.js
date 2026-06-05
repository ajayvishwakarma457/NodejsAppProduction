'use strict';

const http = require('http');

const PORT = process.env.PORT || 5000;
const options = {
  host: 'localhost',
  port: PORT,
  path: '/health',
  timeout: 3000,
};

const request = http.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const payload = JSON.parse(body);
      if (res.statusCode === 200 && payload.status === 'healthy') {
        process.exit(0); // Healthy
      } else {
        console.error(`[Health Check] Unhealthy status code: ${res.statusCode} or status payload: ${payload.status}`);
        process.exit(1); // Unhealthy
      }
    } catch (err) {
      console.error(`[Health Check] Failed to parse health check response: ${err.message}`);
      process.exit(1); // Parse failure
    }
  });
});

request.on('error', (err) => {
  console.error(`[Health Check] Request error: ${err.message}`);
  process.exit(1);
});

request.on('timeout', () => {
  console.error('[Health Check] Request timed out');
  request.destroy();
  process.exit(1);
});

request.end();
