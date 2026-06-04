# MongoDB Transactions and Rollbacks (Mongoose)

This document describes how multi-document ACID transactions are implemented in Mongoose and how rollbacks are handled.

---

## 1. Mongoose Transaction Architecture

Transactions let you execute multiple database operations in isolation and run them atomically. If any operation fails, the entire transaction is rolled back, leaving the database unchanged.

### Prerequisites
* Multi-document transactions require a MongoDB deployment running as a **Replica Set** or a **Sharded Cluster**.
* Mongoose operations within the transaction must explicitly pass the `session` in their options (e.g., `{ session }`).

---

## 2. Implementation details

### Transaction-based Registration (with Fallback)
Inside [src/controllers/v1/authController.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/controllers/v1/authController.js), we run `User.create` and `RefreshToken.create` inside a single transaction session. If MongoDB is running in standalone mode (unsupported transactions), we gracefully fall back to a non-transaction creation:

```javascript
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
} catch (err) {
  await session.abortTransaction();
  session.endSession();

  // Standalone fallback:
  if (err.message.includes('Transaction numbers are only allowed') || err.codeName === 'IllegalOperation') {
    console.warn('⚠️ MongoDB standalone detected. Falling back to non-transaction setup.');
    const user = await User.create({ _id: tempUserId, name, email, password });
    await RefreshToken.create({
      token: refreshToken,
      user: user._id,
      expiresAt: getRefreshTokenExpiry(),
    });
  } else {
    throw err;
  }
}
```

---

## 3. Demo Endpoints

We exposed a test transaction route in [src/routes/v1/transactionRoutes.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/routes/v1/transactionRoutes.js) to show a rollback behavior:

* **Endpoint**: `POST /api/v1/transactions/demo`
* **Route Setup**:
```javascript
router.post('/demo', async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // 1. Create a user
    const [user] = await User.create([{ name, email, password }], { session });

    // 2. Intentionally violate schema validation to trigger rollback
    await RefreshToken.create([{
      user: user._id,
      expiresAt: new Date(Date.now() + 10000)
      // 'token' field is omitted, which is required
    }], { session });

    await session.commitTransaction();
    session.endSession();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    
    // Check if user was actually rolled back (not saved to database)
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
```

---

## 4. Verification & Testing

### Standalone Local Database Behavior
If we invoke the demo route on a standalone MongoDB deployment, the transaction engine catches the `Replica Set required` error and responds appropriately:
```json
{
  "status": "fail",
  "message": "Transactions rollback test skipped: local MongoDB is running as standalone node (Replica Sets required)."
}
```

### Replica Set/Production Environment Rollback Behavior
On a replica set environment, violating the refresh token schema triggers validation errors, aborting the transaction session. Mongoose automatically rolls back the `User.create` operation. The response returns:
```json
{
  "status": "error",
  "message": "Transaction deliberately rolled back due to error.",
  "error": "RefreshToken validation failed: token: Path `token` is required.",
  "userRolledBack": true
}
```
No User record is committed to the database.
