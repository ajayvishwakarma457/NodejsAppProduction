# API Key Authentication

This document describes the design and implementation of API Key Authentication in our application to support machine-to-machine integrations or third-party client authentication.

---

## 1. Key Hashing Security Design

To prevent key leaks in the event of database compromise, we implement cryptographically hashed storage:
* **Generation**: The server generates a cryptographically secure random string with the prefix `sk_live_`.
* **One-Time Visibility**: The raw key is returned to the user **only once** upon generation.
* **Hashing**: The key is hashed using SHA-256 before being stored in the database.
* **Verification**: When a client presents an API key, we hash it and query the database for the matching hash.

```
       [ Client API Key request ] ──► Presents x-api-key: sk_live_...
                                              │
                                              ▼
                                 [ Hashes key using SHA-256 ]
                                              │
                                              ▼
                                 [ Queries ApiKey collection ]
```

---

## 2. API Key Database Schema

Defined in [src/models/apiKeyModel.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/models/apiKeyModel.js):

```javascript
const apiKeySchema = new mongoose.Schema({
  hashedKey: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date }
}, { timestamps: true });
```

---

## 3. Composite Authentication Middleware

In [src/middlewares/v1/authMiddleware.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/middlewares/v1/authMiddleware.js), we expose a composite `authenticate` middleware. It dynamically determines the authentication method based on the request headers:

```javascript
const authenticate = async (req, res, next) => {
  const { apiKeyAuth } = require('./apiKeyMiddleware');

  // 1. Check for Bearer JWT Access Token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, next);
  }

  // 2. Check for x-api-key header
  if (req.headers['x-api-key']) {
    return apiKeyAuth(req, res, next);
  }

  // 3. Fallback if both are missing
  return next(new AppError('Authentication required. Provide Bearer JWT token or x-api-key header.', 401));
};
```

---

## 4. Endpoints & Management

Mounted in [src/routes/v1/apiKeyRoutes.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/routes/v1/apiKeyRoutes.js):

### 1. Create API Key
* **Endpoint**: `POST /api/v1/api-keys`
* **Payload**: `{"name": "Developer Key", "expiresInDays": 30}`
* **Headers**: `Authorization: Bearer <JWT>`
* **Returns**: The raw key `sk_live_...` (shown only once) and key metadata.

### 2. List API Keys
* **Endpoint**: `GET /api/v1/api-keys`
* **Headers**: `Authorization: Bearer <JWT>`
* **Returns**: List of active key metadata (hashed key values are omitted).

### 3. Revoke API Key
* **Endpoint**: `DELETE /api/v1/api-keys/:id`
* **Headers**: `Authorization: Bearer <JWT>`
* **Returns**: Success message. The key is deleted from the database.

---

## 5. Protected Endpoint Access Example

Applying alternative authentication (JWT or API Key) to route configs:

```javascript
// userRoutes.js
const { authenticate, restrictTo } = require('../../middlewares/v1/authMiddleware');

router.use(authenticate);

// Request will succeed if headers contain a valid Bearer JWT *or* x-api-key belonging to an Admin
router.get('/', restrictTo('admin', 'moderator'), UserController.getUsers);
```
