# Rate Limiting with express-rate-limit + Redis Store

Rate limiting is a critical defense mechanism that controls the rate of traffic sent to an API. It protects your infrastructure from brute-force authentication attacks, Denial of Service (DoS/DDoS) attempts, and web scraping.

This project implements rate limiting using `express-rate-limit` with an `ioredis`-backed Redis store via `rate-limit-redis`.

---

## Architecture & Flow

Using a Redis store instead of the default local memory store is standard for production because:
1. **Shared State**: Rate limits are shared across multiple instances of the application (e.g., in clustered environments or serverless scaling).
2. **Persistence**: Server restarts don't reset rate limit counters, preventing users from bypassing limits by triggering restarts.

```
       [ Client Request ]
               │
               ▼
   [ globalRateLimiter Middleware ] ──► Queries Redis (ioredis)
               │
      ┌────────┴────────┐
      ▼ (Limit Not Met)  ▼ (Limit Exceeded)
 [ Route Handler ]    [ 429 Too Many Requests ]
```

---

## Installation

```bash
npm install express-rate-limit rate-limit-redis ioredis
```

---

## Configuration

The rate limiters are defined in [src/middlewares/v1/rateLimiter.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/middlewares/v1/rateLimiter.js):

### Redis Client Setup
```javascript
const Redis = require('ioredis');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
});
```

### 1. Global Rate Limiter
Applied globally in `app.js` to protect all API endpoints.
* **Window**: 15 minutes
* **Max Requests**: 100 requests per IP
* **Headers**: `RateLimit-*` standard headers enabled (draft-7), old `X-RateLimit-*` headers disabled.

### 2. Strict Rate Limiter (for Auth / Sensitive Routes)
Can be applied to specific routes (e.g., `/api/v1/users/login`) to mitigate brute-force attempts.
* **Window**: 15 minutes
* **Max Requests**: 10 requests per IP

---

## Global Application Registration
Registered globally in [src/app.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/app.js):

```javascript
const { globalRateLimiter } = require('./middlewares/v1/rateLimiter');

// ... other middlewares
app.use(cors(corsOptions));

// Register rate limiting right after CORS
app.use(globalRateLimiter);
```

---

## Environment Variables
Add Redis connection configuration to your [.env](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/.env) file:

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password
```
