const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables before routing or database setup
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../../src/config/db');
const logger = require('../../src/utils/logger');
const errorMiddleware = require('../../src/middlewares/v1/errorMiddleware');
const correlationIdMiddleware = require('../../src/middlewares/v1/correlationIdMiddleware');

// Load bounded context routing schemas
const authRoutes = require('../../src/routes/v1/authRoutes');
const userRoutes = require('../../src/routes/v1/userRoutes');

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 6001;

// Body parser and context tracking middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(correlationIdMiddleware);

// Mount core User domain routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Centralized error mapping middleware
app.use(errorMiddleware);

const startService = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`[User Identity Service] Bounded Context successfully active on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`[User Identity Service] Failed to initialize service: ${err.message}`);
    process.exit(1);
  }
};

startService();
