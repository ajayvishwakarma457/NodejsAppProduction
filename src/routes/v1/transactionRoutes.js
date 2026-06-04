const express = require('express');
const mongoose = require('mongoose');
const User = require('../../models/userModel');
const RefreshToken = require('../../models/refreshTokenModel');
const AppError = require('../../utils/AppError');

const router = express.Router();

// POST /api/v1/transactions/demo
router.post('/demo', async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return next(new AppError('Please provide name, email, and password', 400));
  }

  // Ensure user doesn't already exist
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('A user with this email already exists', 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Insert user
    const [user] = await User.create([{ name, email, password }], { session });
    console.log(`[Transaction Demo] Inserted user: ${user.email} within session.`);

    // 2. Deliberate failure: Try to insert a RefreshToken with a missing token field (violates mongoose validation)
    console.log('[Transaction Demo] Attempting to insert invalid RefreshToken to trigger rollback...');
    await RefreshToken.create([{
      user: user._id,
      expiresAt: new Date(Date.now() + 10000)
      // missing 'token' field, which is required
    }], { session });

    // 3. Commit (will not be reached because of the validation error above)
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: 'success',
      message: 'Transaction completed successfully (should not happen in this demo).',
    });
  } catch (err) {
    console.log(`[Transaction Demo] Caught error: ${err.message}. Aborting transaction and rolling back...`);
    await session.abortTransaction();
    session.endSession();

    // If standalone replica set error occurs, warn that rollback test cannot run on standalone
    if (err.message.includes('Transaction numbers are only allowed') || err.codeName === 'IllegalOperation') {
      return res.status(400).json({
        status: 'fail',
        message: 'Transactions rollback test skipped: local MongoDB is running as standalone node (Replica Sets required).',
      });
    }

    // Otherwise, check if user was actually rolled back (not saved to database)
    const userInDb = await User.findOne({ email });
    const userRolledBack = !userInDb;

    res.status(500).json({
      status: 'error',
      message: 'Transaction deliberately rolled back due to error.',
      error: err.message,
      userRolledBack: userRolledBack
    });
  }
});

module.exports = router;
