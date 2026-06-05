const appEventEmitter = require('../utils/appEventEmitter');
const { addEmailJob } = require('../queues/emailQueue');

console.log('[Listeners] userListeners loaded and registering...');

// Listener 1: Dispatch Welcome Email Job via BullMQ
appEventEmitter.on('user:registered', async (user) => {
  console.log(
    `[Event-Listener] Caught 'user:registered' event for ${user.email}. Dispatching Welcome Email job...`
  );
  try {
    const job = await addEmailJob(
      user.email,
      'Welcome to our Production Platform!',
      `Hi ${user.name || 'there'},\n\nWe are excited to have you on board!`,
      2 // Medium Priority
    );
    console.log(`[Event-Listener] Welcome Email job successfully queued. Job ID: ${job.id}`);
  } catch (err) {
    console.error(
      `[Event-Listener] Failed to queue Welcome Email for ${user.email}:`,
      err.message
    );
  }
});

// Listener 2: Security & Audit Logging
appEventEmitter.on('user:registered', (user) => {
  console.log(
    `[Event-Listener] [Audit Log] SECURITY: User registration registered for ID: ${
      user.id || user._id
    } at ${new Date().toISOString()}`
  );
});
