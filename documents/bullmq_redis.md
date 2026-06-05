# Background Jobs & Queues with BullMQ and Redis

This document outlines the implementation of production-grade asynchronous background job processing using the `bullmq` library backed by Redis.

## 1. Overview
In a production web application, long-running tasks such as sending transactional emails, generating PDF reports, and syncing third-party API data should not block the main HTTP request-response cycle. Instead, we offload these tasks by adding them to a Redis-backed queue to be executed asynchronously by dedicated worker processes.

- **BullMQ**: The leading Node.js message queue and background job framework.
- **Redis**: Serves as the state store for job scheduling, tracking, and lock management.

---

## 2. Configuration & Architecture

### Central Redis Config: [redisConfig.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/config/redisConfig.js)
Stores Redis details parsed from the environment:
```javascript
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};
```

### Queue Definition: [emailQueue.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/queues/emailQueue.js)
Instantiates the queue and exports helper methods:
```javascript
const { Queue } = require('bullmq');
const redisConfig = require('../config/redisConfig');

const emailQueue = new Queue('emailQueue', { connection: redisConfig });

async function addEmailJob(to, subject, body) {
  return await emailQueue.add(
    'send-email-job',
    { to, subject, body },
    {
      attempts: 3,                 // Retry up to 3 times on failure
      backoff: {
        type: 'exponential',
        delay: 2000,               // 2s, 4s, 8s exponential retry backoff
      },
    }
  );
}
```

### Background Worker: [emailWorker.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/workers/emailWorker.js)
Listens to queue items and processes them. Implements concurrency of 2 jobs simultaneously.
```javascript
const { Worker } = require('bullmq');
const redisConfig = require('../config/redisConfig');

const emailWorker = new Worker(
  'emailQueue',
  async (job) => {
    const { to, subject, body } = job.data;
    console.log(`[Worker] Started processing job ${job.id}...`);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate delay
    console.log(`[Worker] Successfully completed job ${job.id}`);
  },
  { connection: redisConfig, concurrency: 2 }
);
```

### Server Integration: [server.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/server.js)
Loads the worker during bootstrap and closes the connections gracefully on application shutdown (`SIGTERM`/`SIGINT`).

---

## 3. Usage & Endpoint Testing

- **URL**: `POST /api/v1/jobs/trigger-email`
- **Headers**:
  - `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- **Body**:
  ```json
  {
    "to": "hello@example.com",
    "subject": "Welcome Back!",
    "body": "This is a background job processed by BullMQ!"
  }
  ```

### Verify using cURL
```bash
curl -X POST http://localhost:5000/api/v1/jobs/trigger-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -d '{"to": "hello@example.com", "subject": "Welcome Back!", "body": "This is a background job processed by BullMQ!"}'
```

**Expected HTTP Response (`202 Accepted`)**:
```json
{
  "status": "success",
  "message": "Email job queued for background processing",
  "job": {
    "id": "1",
    "name": "send-email-job",
    "data": {
      "to": "hello@example.com",
      "subject": "Welcome Back!",
      "body": "This is a background job processed by BullMQ!"
    }
  }
}
```

**Console logs**:
```log
[Worker] Started processing job 1 - sending email to hello@example.com...
[Worker] Successfully completed job 1 - email sent to hello@example.com
[Worker] Job 1 completed successfully
```
