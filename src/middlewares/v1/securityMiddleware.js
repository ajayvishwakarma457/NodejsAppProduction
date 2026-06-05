'use strict';

const crypto = require('crypto');
const logger = require('../../utils/logger');

/**
 * Deep sanitization helper to strip keys starting with $ or containing . (NoSQL Injection mitigation)
 */
function sanitizeObject(obj) {
  if (obj instanceof Array) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'object' && obj[i] !== null) {
        sanitizeObject(obj[i]);
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (key.startsWith('$') || key.includes('.')) {
        logger.warn(`[Security] Stripped potentially malicious NoSQL injection key: ${key}`);
        delete obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
}

/**
 * Middleware: NoSQL Query Injection Prevention
 */
const mongoSanitize = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
};

/**
 * Helper to sanitize HTML strings (XSS mitigation)
 */
function cleanString(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeXss(obj) {
  if (obj instanceof Array) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'string') {
        obj[i] = cleanString(obj[i]);
      } else if (typeof obj[i] === 'object' && obj[i] !== null) {
        sanitizeXss(obj[i]);
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = cleanString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeXss(obj[key]);
      }
    }
  }
}

/**
 * Middleware: Basic XSS Sanitizer for request body/query/params
 */
const xssSanitize = (req, res, next) => {
  if (req.body) sanitizeXss(req.body);
  if (req.query) sanitizeXss(req.query);
  if (req.params) sanitizeXss(req.params);
  next();
};

/**
 * Middleware: Double-Submit Cookie CSRF Protection
 */
const csrfProtection = (req, res, next) => {
  // 1. Skip GET, HEAD, OPTIONS safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    // Generate token if not already present in request cookies to initialize it
    let csrfToken = req.cookies ? req.cookies['XSRF-TOKEN'] : null;
    if (!csrfToken) {
      csrfToken = crypto.randomBytes(32).toString('hex');
      res.cookie('XSRF-TOKEN', csrfToken, {
        httpOnly: false, // Must be readable by client-side JS to submit back in headers
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
    }
    return next();
  }

  // 2. Validate token for mutating methods
  const cookieToken = req.cookies ? req.cookies['XSRF-TOKEN'] : null;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    logger.warn('[Security] CSRF Validation Failed: Token mismatch or missing');
    return res.status(403).json({
      status: 'error',
      message: 'CSRF token validation failed. Insufficient permissions.'
    });
  }

  next();
};

/**
 * Middleware: Force HTTPS and HSTS Redirect in Production
 */
const enforceHttps = (req, res, next) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

  if (!isHttps && process.env.NODE_ENV === 'production') {
    logger.warn(`[Security] Redirecting insecure request to HTTPS: ${req.headers.host}${req.url}`);
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }

  // Set HSTS Header if HTTPS
  if (isHttps) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

module.exports = {
  mongoSanitize,
  xssSanitize,
  csrfProtection,
  enforceHttps
};
