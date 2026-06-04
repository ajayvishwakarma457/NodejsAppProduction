# In-memory Caching with node-cache

This document describes the design and implementation of L1 local in-memory caching using the `node-cache` package, combined with L2 global caching (Redis) to build a high-performance two-tier hybrid caching system.

---

## 1. Hybrid Caching Architecture (L1/L2 Cache)

To achieve microsecond retrieval times and eliminate database & network roundtrips, we utilize a **two-tier cache**:

1. **L1 (Local/In-Memory)**: Keys are stored inside the application process memory space via `node-cache`. Lookups take nanoseconds, avoiding network roundtrips. Unique to each container pod.
2. **L2 (Global/Distributed)**: Keys are stored in Redis. Shared across all nodes.
3. **Database**: MongoDB serves as the source of truth.

### Read Pipeline (Two-Tier Lazy Loading)
```
          [ Read Request ]
                 |
                 v
         /---------------\
        /  Is data in     \    Yes (L1 Hit)
       <   L1 Local Cache? > -----------------> [ Return Data ]
        \                 /
         \---------------/
                 | No (L1 Miss)
                 v
         /---------------\
        /  Is data in     \    Yes (L2 Hit)
       <   L2 Redis Cache? > -----------------> [ Populate L1 ] ---> [ Return Data ]
        \                 /
         \---------------/
                 | No (L2 Miss)
                 v
       [ Query MongoDB ]
                 |
                 v
      [ Save to L2 & L1 ]
                 |
                 v
           [ Return Data ]
```

---

## 2. Code Implementation

### A. Local Cache Utility
Created in [src/utils/localCache.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/utils/localCache.js):
```javascript
const NodeCache = require('node-cache');
const localCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5m default TTL
module.exports = localCache;
```

### B. Controller Integration
Updated in [src/controllers/v1/userController.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/controllers/v1/userController.js):
```javascript
getUserById: async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `user_cache:${id}`;

    // 1. Try L1 Cache (local memory)
    const cachedL1 = localCache.get(cacheKey);
    if (cachedL1) {
      console.log(`[Cache-aside] L1 HIT for user:${id}`);
      return res.json(cachedL1);
    }

    console.log(`[Cache-aside] L1 MISS. Checking L2 Cache (Redis)...`);

    // 2. Try L2 Cache (Redis)
    const cachedL2 = await redisClient.get(cacheKey);
    if (cachedL2) {
      console.log(`[Cache-aside] L2 HIT. Populating L1...`);
      const userObj = JSON.parse(cachedL2);
      localCache.set(cacheKey, userObj, 300); // Save to L1 (5m TTL)
      return res.json(userObj);
    }

    console.log(`[Cache-aside] L2 MISS. Querying MongoDB database...`);
    
    // 3. Database Query
    const user = await User.findById(id);
    if (!user) return next(new AppError(`User not found`, 404));

    // 4. Populate L2 and L1
    await redisClient.set(cacheKey, JSON.stringify(user), 'EX', 3600); // L2 (1h TTL)
    localCache.set(cacheKey, user.toObject(), 300); // L1 (5m TTL)

    res.json(user);
  } catch (err) {
    next(err);
  }
}
```

### C. Invalidation Sync (Pub/Sub)
We leverage our Redis Pub/Sub invalidator inside [src/utils/pubSubInvalidator.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/utils/pubSubInvalidator.js) to clear L1 local keys across all scaled nodes when an invalidation event is published:
```javascript
subRedisClient.on('message', async (channel, message) => {
  if (channel === CHANNEL_NAME) {
    console.log(`🔔 [Pub/Sub Invalidation] Broadcast received to invalidate key: "${message}"`);
    
    // Purge from local memory (L1)
    localCache.del(message);
    console.log(`🧹 [Pub/Sub Invalidation] Deleted key "${message}" from L1 Local Cache.`);

    // Purge from Redis (L2)
    await redisClient.del(message);
    console.log(`🧹 [Pub/Sub Invalidation] Deleted key "${message}" from Redis.`);
  }
});
```

---

## 3. Verification & Execution Logs

1. **L1 Miss, L2 Miss (First Request)**:
   `[Cache-aside] L1 MISS for user:6a2179afaab6dde6852e073e. Checking L2 Cache (Redis)...`
   `[Cache-aside] L2 MISS for user:6a2179afaab6dde6852e073e. Querying MongoDB database...`
2. **L1 Hit (Subsequent Request)**:
   `[Cache-aside] L1 HIT for user:6a2179afaab6dde6852e073e`
3. **Invalidation Broadcast on Update**:
   `PUT /api/v1/users/6a2179afaab6dde6852e073e`
   `📣 [Pub/Sub Invalidation] Publishing invalidation for key: "user_cache:6a2179afaab6dde6852e073e"`
   `🔔 [Pub/Sub Invalidation] Broadcast received to invalidate key: "user_cache:6a2179afaab6dde6852e073e"`
   `🧹 [Pub/Sub Invalidation] Deleted key "user_cache:6a2179afaab6dde6852e073e" from L1 Local Cache.`
   `🧹 [Pub/Sub Invalidation] Deleted key "user_cache:6a2179afaab6dde6852e073e" from Redis.`
L1 and L2 caches are cleared synchronously.
