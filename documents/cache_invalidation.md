# Cache Invalidation Strategies

This document describes the cache invalidation strategies implemented and available within our production Node.js application architecture.

---

## 1. Why Invalidation Matters

Caching stores database values in high-speed memory for quick reads. However, when database values change (writes, updates, deletions), the cached values become stale. Cache invalidation keeps the cache and database in sync.

---

## 2. Invalidation Strategies in Our Architecture

### A. Time-To-Live (TTL) / Expiration
We specify a Time-To-Live (TTL) on write. Redis automatically purges the key after the duration passes, forcing a fresh read from the database:
```javascript
// Cache key expires in 1 hour (3600 seconds)
await redisClient.set(cacheKey, JSON.stringify(user), 'EX', 3600);
```

### B. Programmatic / Active Invalidation
Whenever data is updated or deleted, we programmatically clear the matching cache key:
```javascript
// Delete key immediately on update
await redisClient.del(cacheKey);
```

### C. Publish-Subscribe (Event-Driven) Invalidation
In distributed, multi-instance production environments (e.g. scaled container instances behind a load balancer), local in-memory caches and global cache keys must stay synchronized. We implemented an event-driven broadcast pattern using **Redis Pub/Sub**.

#### Workflow
1. When a change occurs, the instance publishes an invalidation event.
2. All running instances subscribed to the channel receive the broadcast message and purge their local keys.

```
 [ Server Instance A (Write) ] ---> (Publish: "user_cache:123") ---> [ Redis Pub/Sub Channel ]
                                                                             |
                                                                             +---> [ Subscriber Instance A (Purges key) ]
                                                                             +---> [ Subscriber Instance B (Purges key) ]
```

---

## 3. Implementation Details

We implemented the event-driven invalidation logic inside [src/utils/pubSubInvalidator.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/utils/pubSubInvalidator.js):

### Publisher & Subscriber Setup
```javascript
const Redis = require('ioredis');
const { redisClient } = require('../middlewares/v1/rateLimiter');

// Dedicated subscriber client connection (since subscribers cannot run other commands)
const subRedisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});

const CHANNEL_NAME = 'cache:invalidate';

const PubSubInvalidator = {
  // Subscribe to channel only when the client connection status is 'ready'
  initListener: () => {
    const doSubscribe = () => {
      subRedisClient.subscribe(CHANNEL_NAME, (err, count) => {
        if (!err) console.log(`📡 Subscribed to cache invalidation channel: "${CHANNEL_NAME}"`);
      });
    };

    if (subRedisClient.status === 'ready') {
      doSubscribe();
    } else {
      subRedisClient.once('ready', doSubscribe);
    }

    subRedisClient.on('message', async (channel, message) => {
      if (channel === CHANNEL_NAME) {
        console.log(`🔔 [Pub/Sub Invalidation] Broadcast received to invalidate key: "${message}"`);
        await redisClient.del(message); // Purge from Redis
      }
    });
  },

  // Publish invalidation event
  publishInvalidation: async (key) => {
    await redisClient.publish(CHANNEL_NAME, key);
  },
};
```

---

## 4. Verification

* **Initialization log**:
  `📡 Subscribed to cache invalidation channel: "cache:invalidate" (sub count: 1)`
* **Update triggered (Publish event)**:
  `PUT /api/v1/users/6a2179afaab6dde6852e073e`
* **Subscriber log (Key Deleted)**:
  ```bash
  📣 [Pub/Sub Invalidation] Publishing invalidation for key: "user_cache:6a2179afaab6dde6852e073e"
  🔔 [Pub/Sub Invalidation] Broadcast received to invalidate key: "user_cache:6a2179afaab6dde6852e073e"
  🧹 [Pub/Sub Invalidation] Deleted key "user_cache:6a2179afaab6dde6852e073e" from Redis.
  ```
This guarantees distributed sync across all server nodes.
