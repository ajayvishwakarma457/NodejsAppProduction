# Redis Fundamentals (Strings, Hashes, Sorted Sets, TTL)

This document describes how key Redis data structures are utilized with the `ioredis` client to support high-performance caching.

---

## 1. Setup & Connection

We reuse the existing central Redis client (`redisClient`) initialized in [src/middlewares/v1/rateLimiter.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/middlewares/v1/rateLimiter.js):

```javascript
const Redis = require('ioredis');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});
```

---

## 2. Controller & Data Structures Implementation

We implemented endpoints to interact with major Redis data types inside [src/controllers/v1/redisDemoController.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/controllers/v1/redisDemoController.js).

### A. Strings (Simple Key-Value Cache + TTL)
Used for basic value caching. A Time-To-Live (TTL) is specified via `EX` (seconds) options.
* **Write**: `SET key value EX seconds`
* **Read**: `GET key`

```javascript
// Set string with optional TTL
if (ttl) {
  await redisClient.set(`demo_str:${key}`, value, 'EX', parseInt(ttl, 10));
} else {
  await redisClient.set(`demo_str:${key}`, value);
}
```

### B. Hashes (Objects Caching)
Used for structured object data. Maps flat nested keys and values.
* **Write**: `HSET key field value [field value ...]`
* **Read**: `HGETALL key`

```javascript
const hashKey = `demo_hash:${key}`;
await redisClient.hset(hashKey, data);
if (ttl) {
  await redisClient.expire(hashKey, parseInt(ttl, 10));
}
```

### C. Sorted Sets (Leaderboards & Ordered Lists)
Used to maintain ranked scores. Elements are automatically sorted ascending/descending by score.
* **Write**: `ZADD key score member`
* **Read**: `ZREVRANGE key start stop [WITHSCORES]`

```javascript
// Add member to sorted set
await redisClient.zadd('demo_leaderboard', parseFloat(score), username);

// Get top 10 elements in descending order (highest score first)
const list = await redisClient.zrevrange('demo_leaderboard', 0, 9, 'WITHSCORES');
```

---

## 3. Endpoint Configuration

Routes are exposed in [src/routes/v1/redisDemoRoutes.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/routes/v1/redisDemoRoutes.js):

```javascript
router.post('/string', RedisDemoController.setString);
router.get('/string/:key', RedisDemoController.getString);
router.post('/hash', RedisDemoController.setHash);
router.get('/hash/:key', RedisDemoController.getHash);
router.post('/leaderboard', RedisDemoController.addToLeaderboard);
router.get('/leaderboard', RedisDemoController.getLeaderboard);
```
Mounted in [src/routes/v1/index.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/routes/v1/index.js) under `/api/v1/redis-demo`.

---

## 4. Verification

### 1. Redis String caching
* **POST** `/api/v1/redis-demo/string`: `{"key":"testkey","value":"hello-redis","ttl":60}`
* **GET** `/api/v1/redis-demo/string/testkey` (immediate):
```json
{
  "status": "success",
  "key": "demo_str:testkey",
  "value": "hello-redis"
}
```

### 2. Redis Hash caching
* **POST** `/api/v1/redis-demo/hash`: `{"key":"user1","data":{"name":"John Doe","role":"developer","active":"true"},"ttl":60}`
* **GET** `/api/v1/redis-demo/hash/user1`:
```json
{
  "status": "success",
  "key": "demo_hash:user1",
  "data": {
    "name": "John Doe",
    "role": "developer",
    "active": "true"
  }
}
```

### 3. Redis Sorted Sets (Leaderboard)
* Adding scores: `UserA: 150`, `UserB: 300`, `UserC: 220`
* **GET** `/api/v1/redis-demo/leaderboard`:
```json
{
  "status": "success",
  "leaderboard": [
    { "username": "UserB", "score": 300 },
    { "username": "UserC", "score": 220 },
    { "username": "UserA", "score": 150 }
  ]
}
```
Sorted sets automatically sort values descending by score.
