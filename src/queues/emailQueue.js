const { Queue } = require('bullmq');
const redisConfig = require('../config/redisConfig');

const emailQueue = new Queue('emailQueue', {
  connection: redisConfig,
});

/**
 * Adds a background email job to the queue
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} body - Email body content
 * @returns {Promise<Object>} The added BullMQ job
 */
async function addEmailJob(to, subject, body, priority = 3) {
  return await emailQueue.add(
    'send-email-job',
    { to, subject, body },
    {
      priority, // Priority (lower numbers mean higher priority, e.g. 1 = High, 3 = Low)
      attempts: 3, // Retry up to 3 times on failure
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s exponential backoff retry logic
      },
    }
  );
}

module.exports = {
  emailQueue,
  addEmailJob,
};
