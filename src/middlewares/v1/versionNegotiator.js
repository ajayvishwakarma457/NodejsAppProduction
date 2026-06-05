const logger = require('../../utils/logger');

/**
 * API Version Negotiator Middleware
 * Analyzes requests to root `/api` paths and rewrites the internal request URL to
 * the correct versioned controller path (e.g. `/api/v1/...`) depending on:
 * 1. Query parameters: ?v=1 or ?version=1
 * 2. Custom headers: X-API-Version: 1
 * 3. Accept headers: Accept: application/vnd.production.v1+json
 */
const versionNegotiator = (req, res, next) => {
  // Only intercept paths that start with '/api/' but do not explicitly declare version directories (like /api/v1)
  const isPlainApiPath = req.url.startsWith('/api/') && !/^\/api\/v\d+/.test(req.url);
  if (!isPlainApiPath) {
    return next();
  }

  let resolvedVersion = 'v1'; // Default version fallback

  // 1. Resolve from Query Param (?v=1 or ?version=1)
  if (req.query.v) {
    resolvedVersion = `v${req.query.v}`;
  } else if (req.query.version) {
    resolvedVersion = `v${req.query.version}`;
  }
  // 2. Resolve from Custom Header (X-API-Version: 1)
  else if (req.headers['x-api-version']) {
    resolvedVersion = `v${req.headers['x-api-version']}`;
  }
  // 3. Resolve from Accept Header (Accept: application/vnd.production.v1+json)
  else if (req.headers.accept && req.headers.accept.includes('application/vnd.production.')) {
    const match = req.headers.accept.match(/application\/vnd\.production\.v(\d+)\+json/);
    if (match && match[1]) {
      resolvedVersion = `v${match[1]}`;
    }
  }

  // Rewrite the internal request URL (e.g. '/api/users' -> '/api/v1/users')
  const originalUrl = req.url;
  req.url = req.url.replace('/api/', `/api/${resolvedVersion}/`);

  logger.debug(`[Version Negotiator] Request URL rewritten: ${originalUrl} -> ${req.url}`);

  next();
};

module.exports = versionNegotiator;
