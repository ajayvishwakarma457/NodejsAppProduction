# Security Hardening Guide (OWASP & Hardening)

This document details the security hardening measures implemented in the application to protect against the OWASP Top 10 vulnerabilities, secure SQL/NoSQL databases, establish a Content Security Policy (CSP), block CSRF attacks, enforce secure transport, and integrate security scanners into CI/CD.

---

## 1. OWASP Top 10 Mitigations for Node.js

Our codebase implements defense-in-depth mitigations against major threat vectors:

### A. Injection (NoSQL & SQL)
- **NoSQL Injection**: Malicious queries attempting to bypass validation using operators (e.g. `{"$gt": ""}`) are intercepted and stripped by the `mongoSanitize` middleware in [securityMiddleware.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/middlewares/v1/securityMiddleware.js). Any keys starting with `$` or containing `.` are automatically removed from `req.body`, `req.query`, and `req.params`.
- **SQL Injection**: Prevented using parameterized queries in Prisma (details below).

### B. Broken Authentication
- **Secure Password Hashing**: Passwords are encrypted using high-entropy `bcryptjs` rounds.
- **Brute-Force Protection**: Express global and route-specific rate limiters (integrated with a Redis backstore in [rateLimiter.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/middlewares/v1/rateLimiter.js)) block brute-force attacks on sensitive endpoints.
- **Secure Sessions**: Cookies configured in [app.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/app.js) enforce `httpOnly: true` (prevents cross-site scripting read access), `sameSite: 'lax'`, and are secure in production.

### C. Cross-Site Scripting (XSS)
- Input text is recursively sanitized by the `xssSanitize` middleware which escapes characters like `<` and `>` into safe HTML entities before they reach database storage or views.

### D. Cross-Site Request Forgery (CSRF)
- A **Double-Submit Cookie CSRF** middleware (`csrfProtection`) checks stateful mutating requests (POST, PUT, PATCH, DELETE).
- The client must read the random `XSRF-TOKEN` cookie initialized on a safe GET request and send it back in the `x-csrf-token` request header. The server verifies they match, mitigating cross-origin request forgery.

---

## 2. SQL Injection Prevention (Parameterized Queries)

We use **Prisma Client** for SQL operations. Standard ORM queries are parameterized automatically by design.

When raw SQL queries are required, the application enforces the use of **tagged template queries** (`prisma.$queryRaw`):

```javascript
// ✅ SECURE (Automatically parameterized prepared statement)
const users = await prisma.$queryRaw`SELECT * FROM "User" WHERE "name" = ${name}`;

// ❌ VULNERABLE (Avoid raw string interpolation in queryRawUnsafe)
const usersUnsafe = await prisma.$queryRawUnsafe(`SELECT * FROM "User" WHERE "name" = '${name}'`);
```

Template literals passed to `queryRaw` are converted into placeholder markers (e.g., `?` or `$1`) before execution, neutralizing SQL injection vectors. Refer to [prisma.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/config/prisma.js) for implementation examples.

---

## 3. Content Security Policy (CSP) & Secure Headers

We use `helmet` in [app.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/app.js) to configure standard security response headers:

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "https://*"],
      "connect-src": ["'self'", "https://*", "http://*"],
    }
  }
}));
```

This strict policy mitigates XSS by locking down allowable source origins for scripts, styles, fonts, and inline assets.

---

## 4. HTTPS Enforcement & HSTS Headers

In production, all HTTP requests are redirected to HTTPS using the `enforceHttps` middleware:
- **HSTS (HTTP Strict Transport Security)**: Sets the response header `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` ensuring that browsers only communicate with our server over secure HTTPS connections.

---

## 5. Security Auditing & Pipelines

1. **Dependency Auditing**:
   - `npm audit` scans dependencies against the npm advisory database.
   - Run local checks with our audit helper script:
     ```bash
     bash scripts/security-audit.sh
     ```
2. **CI/CD Integration**:
   - A GitHub Actions workflow at [.github/workflows/security.yml](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/.github/workflows/security.yml) automatically checks PRs and commits for dependency advisories and placeholders for secret scanner tools (like TruffleHog).

---

## 6. Penetration Testing Basics

To verify implementation correctness locally:
- **Checking Headers**: Run `curl -I http://localhost:5000/health` (or with `x-forwarded-proto: https`) and check for `Strict-Transport-Security`, `Content-Security-Policy`, and `X-Frame-Options`.
- **Active Scanning**: Run scans using tools like **OWASP ZAP** or **Nikto** to probe endpoints for configuration faults:
  ```bash
  nikto -h http://localhost:5000
  ```
