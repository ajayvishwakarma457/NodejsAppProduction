const winston = require('winston');
const path = require('path');
const asyncLocalStorage = require('./tracer');

// Define log levels (following standard npm levels)
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Set level based on environment (default to 'debug' in dev/test, 'info' in prod)
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development' || env === 'test';
  return isDevelopment ? 'debug' : 'info';
};

// Colors for console logging in development
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Link colors to Winston
winston.addColors(colors);

// Winston format modifier: dynamically inject correlationId from ALS context if present
const injectCorrelationId = winston.format((info) => {
  const store = asyncLocalStorage.getStore();
  if (store && store.correlationId) {
    info.correlationId = store.correlationId;
  }
  return info;
});

// Define log format for development (human-readable, colorized)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const cidStr = info.correlationId ? ` [CID: ${info.correlationId}]` : '';
    return `[${info.timestamp}] [${info.level}]${cidStr}: ${info.message}${info.stack ? `\nStack: ${info.stack}` : ''}`;
  })
);

// Define log format for production (structured JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }), // extract stack trace if error object is logged
  winston.format.json()
);

// Choose format based on node environment
const format = winston.format.combine(
  injectCorrelationId(), // run correlation ID injection before rendering formats
  process.env.NODE_ENV === 'production' ? prodFormat : devFormat
);

// Define where to store/output logs
const transports = [
  // Always output to console
  new winston.transports.Console(),

  // Save error logs to a file in production
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format: winston.format.combine(
      injectCorrelationId(),
      prodFormat // always log to files as JSON for query engines
    ),
  }),

  // Save all logs to a combined file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format: winston.format.combine(
      injectCorrelationId(),
      prodFormat
    ),
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

module.exports = logger;
