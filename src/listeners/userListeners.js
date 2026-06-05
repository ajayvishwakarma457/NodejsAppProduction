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

// Listener 2: Security & Audit Logging via RabbitMQ
const rabbitmqProducer = require('../messaging/rabbitmqProducer');

appEventEmitter.on('user:registered', async (user) => {
  const userId = (user.id || user._id || '').toString();
  console.log(`[Event-Listener] [Audit Log] SECURITY: User registration registered for ID: ${userId} at ${new Date().toISOString()}`);
  
  try {
    await rabbitmqProducer.publish(
      'security_exchange',
      'direct',
      'user.register',
      {
        userId,
        name: user.name,
        email: user.email,
        action: 'USER_REGISTERED',
      }
    );
  } catch (err) {
    console.error(`[Event-Listener] Failed to publish registration audit log to RabbitMQ: ${err.message}`);
  }
});

// Listener 3: Activity Streaming via Apache Kafka
const kafkaProducer = require('../messaging/kafkaProducer');

appEventEmitter.on('user:registered', async (user) => {
  const userId = (user.id || user._id || '').toString();
  try {
    await kafkaProducer.publish(
      'user-activities',
      userId, // Partition Key: guarantees order of events per user
      {
        userId,
        email: user.email,
        activity: 'USER_REGISTERED',
        details: 'User registered via onboarding workflow.',
      }
    );
  } catch (err) {
    console.error(`[Event-Listener] Failed to stream user activity to Kafka: ${err.message}`);
  }
});

// Listener 4: Lightweight Notification Pub/Sub via NATS
const natsPublisher = require('../messaging/natsPublisher');

appEventEmitter.on('user:registered', async (user) => {
  const userId = (user.id || user._id || '').toString();
  try {
    await natsPublisher.publish('user.notifications', {
      userId,
      email: user.email,
      name: user.name,
      type: 'WELCOME_NOTIFICATION',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(`[Event-Listener] Failed to publish notification event to NATS: ${err.message}`);
  }
});

