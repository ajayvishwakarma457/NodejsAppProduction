const morgan = require('morgan');
const logger = require('../../utils/logger');

// Define format string for production (JSON structure)
const morganFormatProd = (tokens, req, res) => {
  return JSON.stringify({
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    responseTime: `${tokens['response-time'](req, res)} ms`,
    contentLength: tokens.res(req, res, 'content-length'),
    userAgent: tokens['user-agent'](req, res),
    remoteAddress: tokens['remote-addr'](req, res),
  });
};

// Define format for development (simple dev style string)
const morganFormatDev = ':method :url :status :response-time ms - :res[content-length]';

// Configure the stream connection to Winston
const stream = {
  write: (message) => {
    // Morgan appends a newline character to the end of every message, so we trim it
    logger.http(message.trim());
  },
};

// Select format based on environment
const format = process.env.NODE_ENV === 'production' ? morganFormatProd : morganFormatDev;

// Build the Morgan middleware
const loggerMiddleware = morgan(format, { stream });

module.exports = loggerMiddleware;
