# Queue Retries, Dead Letter Queues (DLQ), and Job Priorities

This document outlines the advanced BullMQ messaging queue features implemented in our Node.js production application: retry logic with exponential backoff, job prioritizing, and persisting failed jobs in a Dead Letter Queue (DLQ).

## 1. Retry Logic & Backoff
Temporary failures (such as SMTP connection timeouts or rate-limiting by external mail APIs) should not cause jobs to be lost.
- **Retry Attempt Limit**: Jobs are configured to automatically retry up to 3 times on failure.
- **Exponential Backoff**: Instead of retrying immediately, we space out retries exponentially (e.g. 2s, then 4s, then 8s) to give down systems time to recover.

```javascript
// Inside queues/emailQueue.js:
attempts: 3,
backoff: {
  type: 'exponential',
  delay: 2000,
}
```

---

## 2. Job Priorities
Jobs can be scheduled with variable priorities. In BullMQ, priority values are numerical, where a lower number represents a higher priority (e.g. `1` is high priority, `3` is low/default priority).

When the worker retrieves jobs, it processes all priority `1` jobs before checking priority `2` or `3` jobs.

- **Trigger Parameter**: The API accepts a `priority` parameter (1, 2, or 3) and feeds it directly to the BullMQ job options.

---

## 3. Dead Letter Queues (DLQ)
When a job fails all retry attempts (e.g., recipient address is invalid), it exhausts the job queue cycle. 

To prevent losing these jobs and to enable inspection or manual retries, we hook into the worker's `failed` event, detect when attempts have been exhausted, and copy the job data to a **MongoDB Dead Letter Queue (DLQ)** database collection.

### DLQ Database Model: [failedJobModel.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/models/failedJobModel.js)
```javascript
const failedJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  queueName: { type: String, required: true },
  name: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  failedReason: { type: String },
  attemptsMade: { type: Number },
  failedAt: { type: Date, default: Date.now }
});
```

### Worker Persistence Logic: [emailWorker.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/workers/emailWorker.js)
```javascript
emailWorker.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= job.opts.attempts) {
    const FailedJob = require('../models/failedJobModel');
    await FailedJob.findOneAndUpdate(
      { jobId: job.id },
      {
        jobId: job.id,
        queueName: 'emailQueue',
        name: job.name,
        data: job.data,
        failedReason: err.message,
        attemptsMade: job.attemptsMade,
        failedAt: new Date()
      },
      { upsert: true }
    );
  }
});
```

---

## 4. API Reference

### Trigger a Job with Priority
- **Endpoint**: `POST /api/v1/jobs/trigger-email`
- **Body**:
  ```json
  {
    "to": "fail@example.com",
    "subject": "System Warning",
    "body": "Urgent alert notification",
    "priority": 1
  }
  ```

### Inspect Dead Letter Queue (Failed Jobs)
- **Endpoint**: `GET /api/v1/jobs/failed`
- **Response**:
  ```json
  {
    "status": "success",
    "results": 1,
    "data": {
      "failedJobs": [
        {
          "jobId": "2",
          "queueName": "emailQueue",
          "name": "send-email-job",
          "data": {
            "to": "fail@example.com",
            "subject": "System Warning",
            "body": "Urgent alert notification"
          },
          "failedReason": "Simulated SMTP transport error",
          "attemptsMade": 3,
          "failedAt": "2026-06-05T06:09:14.488Z"
        }
      ]
    }
  }
  ```
