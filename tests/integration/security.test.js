'use strict';

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const { mongoSanitize, xssSanitize, csrfProtection, enforceHttps } = require('../../src/middlewares/v1/securityMiddleware');
const prismaDb = require('../../src/config/prisma');

// Create a dedicated isolated test app to verify middlewares cleanly without db timeouts
const testApp = express();
testApp.use(express.json());
testApp.use(cookieParser('test-secret'));

// Mount target middlewares
testApp.use(mongoSanitize);
testApp.use(xssSanitize);
testApp.use(csrfProtection);
testApp.use(enforceHttps);

// Public health check or get test route (safe method)
testApp.get('/test', (req, res) => {
  res.json({ body: req.body, query: req.query });
});

// Mutating test route (requires CSRF verification)
testApp.post('/test', (req, res) => {
  res.json({ body: req.body, query: req.query });
});

describe('Security Hardening & OWASP Protections', () => {
  describe('NoSQL Injection Prevention', () => {
    test('should strip keys starting with $ or containing . from request body', async () => {
      // Fetch token first
      const getRes = await request(testApp)
        .get('/test')
        .expect(200);

      const cookies = getRes.headers['set-cookie'];
      const csrfCookie = cookies.find(c => c.includes('XSRF-TOKEN'));
      const token = csrfCookie.split(';')[0].split('=')[1];

      const payload = {
        username: 'alice',
        password: {
          '$gt': 'somepassword', // Injection attempt
          'nested.field': 'malicious'
        }
      };

      const res = await request(testApp)
        .post('/test')
        .set('Cookie', cookies)
        .set('x-csrf-token', token)
        .send(payload)
        .expect(200);

      expect(res.body.body.password).not.toHaveProperty('$gt');
      expect(res.body.body.password).not.toHaveProperty('nested.field');
    });
  });

  describe('XSS Sanitization', () => {
    test('should escape HTML entities from request inputs', async () => {
      const getRes = await request(testApp)
        .get('/test')
        .expect(200);

      const cookies = getRes.headers['set-cookie'];
      const csrfCookie = cookies.find(c => c.includes('XSRF-TOKEN'));
      const token = csrfCookie.split(';')[0].split('=')[1];

      const payload = {
        name: '<script>alert("xss")</script>'
      };

      const res = await request(testApp)
        .post('/test')
        .set('Cookie', cookies)
        .set('x-csrf-token', token)
        .send(payload)
        .expect(200);

      expect(res.body.body.name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });
  });

  describe('HTTPS Enforce & HSTS Headers', () => {
    test('should return Strict-Transport-Security header when request is secure (HTTPS)', async () => {
      const res = await request(testApp)
        .get('/test')
        .set('x-forwarded-proto', 'https')
        .expect(200);

      expect(res.headers).toHaveProperty('strict-transport-security');
      expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
    });
  });

  describe('CSRF Protection', () => {
    test('safe methods (GET) should initialize XSRF-TOKEN cookie', async () => {
      const res = await request(testApp)
        .get('/test')
        .expect(200);

      expect(res.headers).toHaveProperty('set-cookie');
      const hasCsrfCookie = res.headers['set-cookie'].some(cookie => cookie.includes('XSRF-TOKEN'));
      expect(hasCsrfCookie).toBe(true);
    });

    test('mutating methods (POST) should reject request with 403 when CSRF tokens are missing', async () => {
      const res = await request(testApp)
        .post('/test')
        .send({ name: 'Bob' })
        .expect(403);

      expect(res.body).toHaveProperty('message', 'CSRF token validation failed. Insufficient permissions.');
    });

    test('mutating methods (POST) should accept request when valid CSRF token is provided in headers', async () => {
      const getRes = await request(testApp)
        .get('/test')
        .expect(200);

      const cookies = getRes.headers['set-cookie'];
      const csrfCookie = cookies.find(c => c.includes('XSRF-TOKEN'));
      const token = csrfCookie.split(';')[0].split('=')[1];

      const postRes = await request(testApp)
        .post('/test')
        .set('Cookie', cookies)
        .set('x-csrf-token', token)
        .send({ name: 'Charles' })
        .expect(200);

      expect(postRes.body.body.name).toBe('Charles');
    });
  });

  describe('SQL Injection Prevention (Prisma Parameterization)', () => {
    test('Prisma service handles parameterized queries safely', async () => {
      // Mock the prisma raw queries
      jest.spyOn(prismaDb.client, '$queryRaw').mockResolvedValue([]);
      jest.spyOn(prismaDb.client, '$queryRawUnsafe').mockResolvedValue([]);

      await prismaDb.findUserByNameRawSafe("admin' OR '1'='1");
      expect(prismaDb.client.$queryRaw).toHaveBeenCalled();

      await prismaDb.findUserByNameRawUnsafe("admin' OR '1'='1");
      expect(prismaDb.client.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("WHERE \"name\" = 'admin' OR '1'='1'")
      );
    });
  });
});
