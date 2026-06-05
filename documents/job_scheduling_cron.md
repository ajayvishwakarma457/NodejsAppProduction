# Job Scheduling with node-cron

This document details the implementation of scheduled recurring tasks using the `node-cron` library in our Node.js production application.

## 1. Overview
Production applications require recurring tasks to run at scheduled intervals (e.g. daily database backups, generating billing invoices at midnight, cleaning up stale sessions/logs). 

- **node-cron**: A tiny, pure-JavaScript scheduler that parses full crontab syntax and schedules tasks directly within the Node.js process using standard Node timers.

---

## 2. Implementation & Architecture

### Cron Registry: [cronScheduler.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/utils/cronScheduler.js)
Stores, registers, and tracks active cron tasks. It provides clean `init()` and `stop()` methods.
```javascript
const cron = require('node-cron');
const mongoose = require('mongoose');
const User = require('../models/userModel');

let activeJobs = [];

const CronScheduler = {
  init: () => {
    console.log('[Cron] Initializing cron scheduled tasks...');

    // Audit report runs every minute: * * * * *
    const userAuditTask = cron.schedule('* * * * *', async () => {
      console.log('[Cron] Running scheduled database audit task...');
      try {
        if (mongoose.connection.readyState === 1) {
          const userCount = await User.countDocuments();
          console.log(`[Cron] [Audit Report] Total registered users: ${userCount}`);
        }
      } catch (err) {
        console.error('[Cron] Error executing user audit:', err.message);
      }
    });

    activeJobs.push(userAuditTask);
  },

  stop: () => {
    console.log('[Cron] Stopping active cron jobs...');
    activeJobs.forEach((job) => job.stop());
    activeJobs = [];
  },
};

module.exports = CronScheduler;
```

### Application Integration: [server.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/server.js)
The scheduler is initialized on startup:
```javascript
const CronScheduler = require('./utils/cronScheduler');
CronScheduler.init();
```
On server teardown (`SIGTERM` or `SIGINT`), we invoke `CronScheduler.stop()` to ensure that no orphan timers are left running.

---

## 3. Verification & Log Outputs
When starting the server, the scheduler runs and logs outputs to stdout recurringly:
```log
[Cron] Initializing cron scheduled tasks...
...
[Cron] Running scheduled database audit task...
[Cron] [Audit Report] Total registered users: 5
```
This confirms node-cron is correctly running scheduled operations in the background.
