# API Versioning Strategies

This document details the configuration, tradeoffs, and code implementation of different **API Versioning Strategies** in our production Node.js application.

---

## 1. Industry Standard Versioning Strategies

When APIs evolve, breaking changes occur. To prevent breaking existing clients, APIs use versioning. The four primary strategies are:

1. **URI Path Versioning (Most Popular)**: Version is declared in the request path.
   * Format: `GET /api/v1/users`
   * Pros: High visibility, easy to route using directories/routers, easily testable in browsers.
2. **Query Parameter Versioning**: Version is passed in query parameters.
   * Format: `GET /api/users?v=1`
   * Pros: Fallback routes easily, clean paths, default parameters.
3. **Custom Headers Versioning**: Version is passed in a custom HTTP header.
   * Format: `GET /api/users` (Header: `X-API-Version: 1`)
   * Pros: Keeps URLs clean, separates API version from resource path.
4. **Accept Header (Media Type / Content Negotiation) Versioning**: Version is declared inside standard `Accept` content headers.
   * Format: `GET /api/users` (Header: `Accept: application/vnd.production.v1+json`)
   * Pros: Adheres strictly to REST HATEOAS principles, keeps URLs clean.

---

## 2. Universal Version Negotiation

To support all four strategies simultaneously in our app, we created the Version Negotiator middleware located in [versionNegotiator.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/middlewares/v1/versionNegotiator.js).

If a client requests a resource using plain unversioned URLs (e.g. `GET /api/users`), the negotiator middleware intercepts the call, analyzes version parameters from headers/queries, resolves the version, and internally rewrites the request path (e.g. to `/api/v1/users`):

```javascript
const versionNegotiator = (req, res, next) => {
  // Only intercept plain api routes
  const isPlainApiPath = req.url.startsWith('/api/') && !/^\/api\/v\d+/.test(req.url);
  if (!isPlainApiPath) {
    return next();
  }

  let resolvedVersion = 'v1'; // fallback

  // 1. Resolve from query param (?v=1 or ?version=1)
  if (req.query.v) {
    resolvedVersion = `v${req.query.v}`;
  } else if (req.query.version) {
    resolvedVersion = `v${req.query.version}`;
  }
  // 2. Resolve from custom header (X-API-Version: 1)
  else if (req.headers['x-api-version']) {
    resolvedVersion = `v${req.headers['x-api-version']}`;
  }
  // 3. Resolve from Accept header (Accept: application/vnd.production.v1+json)
  else if (req.headers.accept && req.headers.accept.includes('application/vnd.production.')) {
    const match = req.headers.accept.match(/application\/vnd\.production\.v(\d+)\+json/);
    if (match && match[1]) {
      resolvedVersion = `v${match[1]}`;
    }
  }

  // Rewrite internal request path
  req.url = req.url.replace('/api/', `/api/${resolvedVersion}/`);

  next();
};
```

Mounting this globally in [app.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/app.js) before routers matches all strategies cleanly:

```javascript
// --- 0. Request Context & Tracing Middleware ---
app.use(correlationIdMiddleware);
app.use(versionNegotiator);
```

---

## 3. Integration Testing

We added integration tests in [versionNegotiatorIntegration.test.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/tests/integration/versionNegotiatorIntegration.test.js) to verify all paths:
* Asserts unversioned queries fallback to default `v1`.
* Asserts query parameters (`?v=1`) map correctly.
* Asserts `X-API-Version` custom headers translate correctly.
* Asserts custom `Accept` headers resolve correctly.
