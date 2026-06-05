const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../models/userModel');
const RefreshToken = require('../../models/refreshTokenModel');
const AppError = require('../../utils/AppError');

// Helper to sign JWT Access Token
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
};

// Helper to sign JWT Refresh Token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

// Helper to calculate expiration Date for Refresh Token storage
const getRefreshTokenExpiry = () => {
  const durationStr = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const durationVal = parseInt(durationStr, 10);
  const unit = durationStr.slice(-1);

  let ms = durationVal * 24 * 60 * 60 * 1000; // default to days
  if (unit === 'h') ms = durationVal * 60 * 60 * 1000;
  if (unit === 'm') ms = durationVal * 60 * 1000;
  if (unit === 's') ms = durationVal * 1000;

  return new Date(Date.now() + ms);
};

const AuthController = {
  // POST /api/v1/auth/register
  register: async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return next(new AppError('Please provide name, email, and password', 400));
      }

      // Check duplicate email
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return next(new AppError('A user with this email already exists', 400));
      }

      const tempUserId = new mongoose.Types.ObjectId();
      const accessToken = generateAccessToken(tempUserId);
      const refreshToken = generateRefreshToken(tempUserId);

      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const [user] = await User.create([{ _id: tempUserId, name, email, password }], { session });
        await RefreshToken.create([{
          token: refreshToken,
          user: user._id,
          expiresAt: getRefreshTokenExpiry(),
        }], { session });

        await session.commitTransaction();
        session.endSession();

        // Emit user:registered event for decoupled workflows
        const appEventEmitter = require('../../utils/appEventEmitter');
        console.log(`[AuthController] Emitting user:registered event for user: ${user.email}`);
        appEventEmitter.emit('user:registered', {
          id: user._id,
          name: user.name,
          email: user.email,
        });

        res.status(201).json({
          status: 'success',
          accessToken,
          refreshToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
        });
      } catch (err) {
        await session.abortTransaction();
        session.endSession();

        // Graceful fallback for standalone MongoDB deployments where transactions are not supported.
        if (err.message.includes('Transaction numbers are only allowed') || err.codeName === 'IllegalOperation') {
          console.warn('⚠️ MongoDB standalone detected. Falling back to non-transaction setup.');
          const user = await User.create({ _id: tempUserId, name, email, password });
          await RefreshToken.create({
            token: refreshToken,
            user: user._id,
            expiresAt: getRefreshTokenExpiry(),
          });

          // Emit user:registered event for decoupled workflows in fallback setup
          const appEventEmitter = require('../../utils/appEventEmitter');
          console.log(`[AuthController] Emitting user:registered event (fallback path) for user: ${user.email}`);
          appEventEmitter.emit('user:registered', {
            id: user._id,
            name: user.name,
            email: user.email,
          });

          return res.status(201).json({
            status: 'success',
            accessToken,
            refreshToken,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
            },
          });
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/login
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new AppError('Please provide email and password', 400));
      }

      // Find user and explicitly select password field
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
      }

      // Generate tokens
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      // Save refresh token to database
      await RefreshToken.create({
        token: refreshToken,
        user: user._id,
        expiresAt: getRefreshTokenExpiry(),
      });

      res.status(200).json({
        status: 'success',
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/refresh (Refresh Token Rotation - RTR)
  refresh: async (req, res, next) => {
    try {
      const { token } = req.body;

      if (!token) {
        return next(new AppError('Refresh token is required', 400));
      }

      // 1. Verify the signature of the incoming refresh token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      } catch (err) {
        return next(new AppError('Invalid or expired refresh token. Please login again.', 401));
      }

      // 2. Look up the token in the database
      const dbToken = await RefreshToken.findOne({ token });

      // 3. TOKEN REUSE / THEFT DETECTION
      if (!dbToken) {
        // Since jwt.verify succeeded, the token was validly signed but is missing from DB.
        // This implies it was already used and deleted during rotation (indicating theft).
        // For security, revoke ALL refresh tokens for this user!
        await RefreshToken.deleteMany({ user: decoded.id });
        return next(
          new AppError('Compromised session detected. All sessions revoked. Please log in again.', 403)
        );
      }

      // 4. ROTATION: Delete the used token, generate new pair, save new refresh token
      await RefreshToken.deleteOne({ _id: dbToken._id });

      const newAccessToken = generateAccessToken(decoded.id);
      const newRefreshToken = generateRefreshToken(decoded.id);

      await RefreshToken.create({
        token: newRefreshToken,
        user: decoded.id,
        expiresAt: getRefreshTokenExpiry(),
      });

      res.status(200).json({
        status: 'success',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/logout
  logout: async (req, res, next) => {
    try {
      const { token } = req.body;

      if (!token) {
        return next(new AppError('Refresh token is required to log out', 400));
      }

      // Revoke the token from database
      await RefreshToken.deleteOne({ token });

      res.status(200).json({
        status: 'success',
        message: 'Successfully logged out',
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/auth/google/callback (handles passport redirect success)
  googleSuccess: async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return next(new AppError('Google authentication failed', 401));
      }

      // Generate tokens
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      // Save refresh token to database
      await RefreshToken.create({
        token: refreshToken,
        user: user._id,
        expiresAt: getRefreshTokenExpiry(),
      });

      // Redirect client to frontend dashboard passing tokens in URL query params
      const redirectUrl = `${process.env.CLIENT_REDIRECT_URL || 'http://localhost:3000/auth-success'}?accessToken=${accessToken}&refreshToken=${refreshToken}`;
      res.redirect(redirectUrl);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/session/login
  sessionLogin: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new AppError('Please provide email and password', 400));
      }

      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
      }

      // Store user details in session (saved to Redis automatically)
      req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      console.log('sessionLogin: ID =', req.sessionID, 'Session =', req.session);

      req.session.save((err) => {
        if (err) {
          console.error('sessionLogin Save Error:', err);
          return next(err);
        }
        console.log('sessionLogin Save Success!');
        res.status(200).json({
          status: 'success',
          session: req.session.user,
        });
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/auth/session/me
  sessionMe: async (req, res, next) => {
    try {
      console.log('sessionMe: ID =', req.sessionID, 'Session =', req.session);
      if (!req.session || !req.session.user) {
        return next(new AppError('Unauthorized: No active session found.', 401));
      }

      res.status(200).json({
        status: 'success',
        session: req.session.user,
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/session/logout
  sessionLogout: async (req, res, next) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          return next(new AppError('Failed to destroy session.', 500));
        }

        res.clearCookie('connect.sid'); // Clear browser cookie
        res.status(200).json({
          status: 'success',
          message: 'Logged out from session successfully',
        });
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AuthController;
