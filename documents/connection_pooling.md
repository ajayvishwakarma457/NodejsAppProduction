# Connection Pooling (MongoDB & Redis)

This document details the configuration designs and parameters implemented to enable optimal **Connection Pooling** for MongoDB (Mongoose) and Redis (ioredis) within our production microservices architecture.

---

## 1. MongoDB Connection Pooling (Mongoose)

By default, Mongoose manages a pool of TCP socket connections to MongoDB to handle parallel write and read queries. If all connections in the pool are busy, new requests are queued until a socket becomes free.

To support high concurrency and fast failover:
We optimized connection parameters inside **[src/config/db.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/config/db.js)**:

```javascript
const conn = await mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '50', 10),
  minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || '5', 10),
  socketTimeoutMS: 30000,          // Close idle sockets after 30 seconds
  serverSelectionTimeoutMS: 5000,  // Fast fail in 5 seconds if DB is offline
});
```

* **`maxPoolSize`**: Sets the maximum number of concurrent open sockets (default 50). Limits memory overhead while supporting high volume parallel workloads.
* **`minPoolSize`**: Keeps at least 5 warm sockets open to avoid connection latency overhead when scaling up from idle states.
* **`socketTimeoutMS` / `serverSelectionTimeoutMS`**: Prevents microservice processes from hanging indefinitely on dead database sockets.

---

## 2. Redis Connection Architecture (ioredis)

Unlike database engines, Redis uses a single-threaded execution model where requests multiplex over a single TCP connection. Creating connection pools for generic Redis operations is generally unnecessary and adds extra TCP overhead.

However, certain patterns block or monopolize connection sockets:
1. **Pub/Sub Commands**: Once a Redis client executes `SUBSCRIBE`, it enters subscriber mode and cannot run standard commands (like `GET` or `SET`).
2. **Blocking Operations**: Queues using block-reads (e.g. BullMQ worker loops waiting for jobs) block the client socket connection.
3. **Session vs. Cache Stores**: Isolating session transactions from rate limit cache storage prevents one bottleneck from blocking unrelated business endpoints.

To handle these scenarios, we separate Redis connections into isolated client instances:
* **Session Store Connection** (in `src/app.js`)
* **Rate Limiter Cache Connection** (in `src/middlewares/v1/rateLimiter.js`)
* **Background Queue Connections** (handled automatically inside BullMQ contexts)

### Optimized Redis Connection Settings (`src/config/redisConfig.js`)
We optimized the connections with these options:
* **`maxRetriesPerRequest: null`**: Prevents the client from throwing errors and dropping background queue states when Redis disconnects temporarily (critical for BullMQ worker loops).
* **`enableOfflineQueue: true`**: Buffers commands locally when the client is disconnected, executing them automatically once the socket reconnects.
* **`keepAlive: 30000`**: Sends periodic TCP keepalive pings every 30 seconds to prevent firewalls or routers from dropping idle TCP connections.
* **`reconnectOnError`**: Automatically reconnects if Redis switches to a read-only replica, which prevents failures during Redis Cluster master failovers.

---

## 3. Verification & Testing

Verify that connection pool configurations apply cleanly to both database drivers:
```bash
npm test tests/integration/connectionPooling.test.js
```
