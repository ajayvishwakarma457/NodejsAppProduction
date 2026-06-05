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

const logger = require('./utils/logger');

// Initialize passport configuration
require('./config/passport');

const app = express();

// Initialize separate Redis client for session store
const sessionRedisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
});

sessionRedisClient.on('error', (err) => {
  logger.error('Session Redis Client Error:', err);
});

// --- 1. Global Middlewares ---
// Secure HTTP headers
app.use(helmet());
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

// Custom logging middleware
app.use(loggerMiddleware);

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));



// --- 2. Routes ---
app.use('/api/v1', v1Router);

// Catch-all route handler for non-existent routes
app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server!`, 404));
});

// --- 3. Centralized Error Middleware ---
app.use(errorMiddleware);

module.exports = app;
