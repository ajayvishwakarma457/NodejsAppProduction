const { Worker } = require('bullmq');
const redisConfig = require('../config/redisConfig');

const emailWorker = new Worker(
  'emailQueue',
  async (job) => {
    const { to, subject, body } = job.data;
    console.log(`[Worker] Started processing job ${job.id} - sending email to ${to}...`);

    // Simulate network/SMTP delay (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate failure to show retry/dead-letter queue logic
    if (to === 'fail@example.com') {
      throw new Error('Simulated SMTP transport error');
    }

    console.log(`[Worker] Successfully completed job ${job.id} - email sent to ${to}`);
    return { success: true, to };
  },
  {
    connection: redisConfig,
    concurrency: 2, // Process up to 2 jobs concurrently
  }
);

emailWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed: ${err.message}`);
});

module.exports = emailWorker;
