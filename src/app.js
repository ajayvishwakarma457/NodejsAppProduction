const express = require('express');
const path = require('path');
const loggerMiddleware = require('./middlewares/loggerMiddleware');
const errorMiddleware = require('./middlewares/errorMiddleware');
const v1Router = require('./routes/v1');
const AppError = require('./utils/AppError');

const app = express();

// --- 1. Global Middlewares ---
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
