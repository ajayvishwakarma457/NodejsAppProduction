const express = require('express');
const path = require('path');
const loggerMiddleware = require('./middlewares/loggerMiddleware');
const errorMiddleware = require('./middlewares/errorMiddleware');
const userRoutes = require('./routes/userRoutes');

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
app.use('/api/users', userRoutes);

// Catch-all route handler for non-existent routes
app.use((req, res, next) => {
  const error = new Error(`Cannot ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error); // Passes to error handling middleware
});

// --- 3. Centralized Error Middleware ---
app.use(errorMiddleware);

module.exports = app;
