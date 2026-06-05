const cron = require('node-cron');
const mongoose = require('mongoose');
const User = require('../models/userModel');

let activeJobs = [];

const CronScheduler = {
  init: () => {
    console.log('[Cron] Initializing cron scheduled tasks...');

    // Audit task runs every minute: * * * * *
    const userAuditTask = cron.schedule('* * * * *', async () => {
      console.log('[Cron] Running scheduled database audit task...');
      try {
        if (mongoose.connection.readyState === 1) {
          const userCount = await User.countDocuments();
          console.log(`[Cron] [Audit Report] Total registered users: ${userCount}`);
        } else {
          console.log('[Cron] Mongoose connection not ready. Skipping audit.');
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
    console.log('[Cron] Scheduled tasks stopped successfully.');
  },
};

module.exports = CronScheduler;
