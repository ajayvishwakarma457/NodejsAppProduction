const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const loggerMiddleware = require('./middlewares/v1/loggerMiddleware');
const errorMiddleware = require('./middlewares/v1/errorMiddleware');
const v1Router = require('./routes/v1');
const AppError = require('./utils/AppError');
const { globalRateLimiter } = require('./middlewares/v1/rateLimiter');
const Redis = require('ioredis');
const correlationIdMiddleware = require('./middlewares/v1/correlationIdMiddleware');
const versionNegotiator = require('./middlewares/v1/versionNegotiator');

const logger = require('./utils/logger');
const cookieParser = require('cookie-parser');
const { mongoSanitize, xssSanitize, csrfProtection, enforceHttps } = require('./middlewares/v1/securityMiddleware');

// Initialize passport configuration
require('./config/passport');

const app = express();

// --- 0. Request Context & Tracing Middleware ---
app.use(correlationIdMiddleware);
app.use(versionNegotiator);
app.use(enforceHttps);
app.use(cookieParser(process.env.SESSION_SECRET || 'fallback-secret-for-session'));

// Prometheus metrics collection
const { metricsEndpoint } = require('./utils/metrics');
const metricsMiddleware = require('./middlewares/v1/metricsMiddleware');
app.use(metricsMiddleware);
app.get('/metrics', metricsEndpoint);

// Uptime health check endpoint for synthetic monitoring and load balancers
const mongoose = require('mongoose');
app.get('/health', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const mongoStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  
  const redisStatus = sessionRedisClient ? sessionRedisClient.status : 'disconnected';
  const isHealthy = mongoStatus === 1 && redisStatus === 'ready';

  const statusPayload = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: {
        status: mongoStates[mongoStatus] || 'unknown',
        healthy: mongoStatus === 1,
      },
      cache: {
        status: redisStatus,
        healthy: redisStatus === 'ready',
      },
    },
    system: {
      memory: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100} MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`,
      },
    },
  };

  if (isHealthy) {
    return res.status(200).json(statusPayload);
  } else {
    return res.status(503).json(statusPayload);
  }
});


// Initialize separate Redis client for session store
const sessionRedisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
});

sessionRedisClient.on('error', (err) => {
  logger.error('Session Redis Client Error:', err);
});

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// --- 1. Global Middlewares ---
// Secure HTTP headers with customized Content Security Policy to keep Swagger UI functional
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
app.use(passport.initialize());

// Configure Redis Session Store
const sessionStore = new RedisStore({
  client: sessionRedisClient,
  prefix: 'sess:',
});

sessionStore.on('error', (err) => {
  logger.error('Session Store Error:', err);
});

// Configure Session Middleware
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-session',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
  })
);

app.use((req, res, next) => {
  logger.debug('--- SESSION DIAGNOSTIC ---', {
    path: req.path,
    cookieHeader: req.headers.cookie ? 'present' : 'absent',
    sessionId: req.sessionID,
    sessionUserExists: !!(req.session && req.session.user),
  });
  next();
});
// Cross-Origin Resource Sharing (CORS) Configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : [];

    // In development mode, allow all if CORS_ORIGIN is not explicitly configured
    if (process.env.NODE_ENV === 'development' && allowedOrigins.length === 0) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      const error = new Error('Not allowed by CORS');
      error.statusCode = 403; // Forbidden
      callback(error);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Global Rate Limiting
app.use(globalRateLimiter);

// Body parsing middlewares
app.use(express.json()); // parses application/json
app.use(express.urlencoded({ extended: true })); // parses application/x-www-form-urlencoded

// Request Sanitization & CSRF Protections
app.use(mongoSanitize);
app.use(xssSanitize);
if (process.env.NODE_ENV !== 'test') {
  app.use(csrfProtection);
}

const idempotencyMiddleware = require('./middlewares/v1/idempotencyMiddleware');

// Custom logging middleware
app.use(loggerMiddleware);

// Idempotency checks for mutating request retries
app.use(idempotencyMiddleware);

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Mount Swagger interactive API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- 2. Routes ---
app.use('/api/v1', v1Router);

// Catch-all route handler for non-existent routes
app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server!`, 404));
});

// --- 3. Centralized Error Middleware ---
app.use(errorMiddleware);

module.exports = app;
