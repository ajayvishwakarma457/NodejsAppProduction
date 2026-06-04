# Session Management (express-session + Redis)

This document describes the session-based authentication implementation using `express-session` backed by a Redis store via the `connect-redis` package.

---

## 1. Setup and Middleware Configuration

We configured the session middleware inside [src/app.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/app.js). A separate Redis client (`sessionRedisClient`) is instantiated to isolate session operations from other Redis tasks such as rate limiting.

### Package Compatibility Note
To keep compatibility with `ioredis`, the `connect-redis` client was downgraded to `6.1.3` because version `7.x` dropped support for `ioredis` arguments and signatures.

```javascript
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const Redis = require('ioredis');

// Initialize separate Redis client for session store
const sessionRedisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
});

const sessionStore = new RedisStore({
  client: sessionRedisClient,
  prefix: 'sess:',
});

// Configure Session Middleware
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-session',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
  })
);
```

---

## 2. Session Controllers

We implemented the session login, session check (me), and session logout handlers in [src/controllers/v1/authController.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/controllers/v1/authController.js).

### Login Handler
```javascript
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

    req.session.save((err) => {
      if (err) return next(err);
      res.status(200).json({
        status: 'success',
        session: req.session.user,
      });
    });
  } catch (err) {
    next(err);
  }
}
```

### Me Handler
```javascript
sessionMe: async (req, res, next) => {
  try {
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
}
```

### Logout Handler
```javascript
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
}
```

---

## 3. Endpoints Setup

The routes are exposed under [src/routes/v1/authRoutes.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/routes/v1/authRoutes.js):

```javascript
router.post('/session/login', AuthController.sessionLogin);
router.get('/session/me', AuthController.sessionMe);
router.post('/session/logout', AuthController.sessionLogout);
```

---

## 4. Verification

### Session Login
* **API Call**: `POST /api/v1/auth/session/login`
* **Response Body**:
```json
{
  "status": "success",
  "session": {
    "id": "6a216e9a37f510931a7f526d",
    "name": "Session User",
    "email": "sessionuser@example.com",
    "role": "user"
  }
}
```
* **Cookie Received**: `connect.sid` cookie value is set in the headers.

### Redis Persistence Check
Running `KEYS sess:*` in Redis will list the active session:
```bash
1) "sess:aeK8sMSXLC1qzw8_X1S3wwpeaTslTsHD"
```

And viewing the key:
```bash
GET sess:aeK8sMSXLC1qzw8_X1S3wwpeaTslTsHD
```
Returns:
```json
{"cookie":{"originalMaxAge":86400000,"expires":"2026-06-05T12:25:35.155Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"user":{"id":"6a216e9a37f510931a7f526d","name":"Session User","email":"sessionuser@example.com","role":"user"}}
```
