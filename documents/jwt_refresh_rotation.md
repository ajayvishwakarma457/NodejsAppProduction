# JWT Authentication & Refresh Token Rotation (RTR)

This document describes the implementation of JWT Access Tokens and a secure Refresh Token Rotation (RTR) mechanism with Token Reuse (Theft) Detection in this Express.js and MongoDB application.

---

## 1. Authentication Flow Architecture

```
┌────────┐               Credentials               ┌────────┐
│ Client │ ──────────────────────────────────────> │ Server │
└────────┘                                         └────────┘
    ▲      <──────────────────────────────────────     │
    │             Access & Refresh Tokens             ▼
    │                                            Hash & Save
    │                                           Refresh Token
    │
┌────────┐             Access Token                ┌────────┐
│ Client │ ──────────────────────────────────────> │ Server │ (Verifies Signature &
└────────┘            (Authorization)              └────────┘  Attaches req.user)
```

---

## 2. Refresh Token Rotation (RTR) & Reuse Detection Flow

To prevent stolen refresh tokens from keeping a session active indefinitely, we implement **Rotation** and **Reuse Detection**:

```
[ Client requests token rotation using Refresh Token ]
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
          (Token in DB)     (Token NOT in DB)
                │                   │
         [ ROTATION LOOP ]          ├──► [ THEFT DETECTED ]
                │                   │
  1. Delete used refresh token.     ├──► Revoke ALL refresh tokens for the user.
  2. Generate new Access Token.    ├──► Force re-authentication.
  3. Generate new Refresh Token.    └──► Return 403 Forbidden.
  4. Save new Refresh Token in DB.
  5. Return new pair to client.
```

---

## 3. Configuration & Schemas

### Refresh Token Schema (`src/models/refreshTokenModel.js`)
Stores only active refresh tokens linked to a user. Supports automated pruning via MongoDB TTL indexes:

```javascript
const refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true }
});

// TTL Index to automatically expire documents from MongoDB
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

---

## 4. API Endpoints

### 1. Register User
* **Endpoint**: `POST /api/v1/auth/register`
* **Payload**: `{"name": "...", "email": "...", "password": "..."}`
* **Returns**: Access Token, Refresh Token, and User Details.

### 2. Login User
* **Endpoint**: `POST /api/v1/auth/login`
* **Payload**: `{"email": "...", "password": "..."}`
* **Returns**: Access Token, Refresh Token, and User Details.

### 3. Rotate Tokens (Refresh Session)
* **Endpoint**: `POST /api/v1/auth/refresh`
* **Payload**: `{"token": "<refreshToken>"}`
* **Returns**: A brand new Access Token and rotated Refresh Token.

### 4. Logout User (Revocation)
* **Endpoint**: `POST /api/v1/auth/logout`
* **Payload**: `{"token": "<refreshToken>"}`
* **Returns**: Success message. The refresh token is deleted from the DB.

---

## 5. Protected Routes Middleware

The `protect` middleware guards sensitive routes. It extracts the Bearer token from the `Authorization` header, verifies the signature, confirms the user still exists, and injects `req.user`.

```javascript
// Example usage in src/routes/v1/userRoutes.js
const { protect } = require('../../middlewares/v1/authMiddleware');

router.use(protect);
router.get('/', UserController.getUsers);
```

---

## 6. Environment Configurations
Configure secrets and TTLs in the [.env](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/.env) file:

```env
JWT_SECRET=super_secret_key_for_signing_access_tokens
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=another_super_secret_key_for_refresh_tokens
JWT_REFRESH_EXPIRES_IN=7d
```
