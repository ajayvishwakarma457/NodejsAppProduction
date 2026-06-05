# Event-Driven Patterns with Node.js EventEmitter

This document outlines the design and implementation of event-driven decoupled systems using Node's built-in `EventEmitter` class in our production application.

## 1. Overview
In standard monolithic setups, controllers handle core logic alongside peripheral actions (such as logging audits, setting up marketing profiles, sending emails). Over time, controllers become bloated, violating the Single Responsibility Principle.

By implementing an **EventEmitter pattern**:
- The main controller only performs its core function (e.g., registering the user in MongoDB) and fires a standard application event (e.g., `'user:registered'`).
- Multiple independent listeners intercept the event asynchronously and execute peripheral actions.
- Features are decoupled: listeners can fail without breaking the user registration response.

---

## 2. Architecture & Design

### Shared Event Emitter: [appEventEmitter.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/utils/appEventEmitter.js)
Initializes and shares a central singleton `EventEmitter` instance:
```javascript
const EventEmitter = require('events');
class AppEventEmitter extends EventEmitter {}
const appEventEmitter = new AppEventEmitter();
module.exports = appEventEmitter;
```

### Event Listeners: [userListeners.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/listeners/userListeners.js)
Listens to `'user:registered'` events and initiates decoupled tasks:
1. **Welcome Email Job**: Calls the `addEmailJob()` helper to add a background email job to the BullMQ task queue.
2. **Audit Logging**: Logs the user ID and registration timestamp for security logging.

```javascript
const appEventEmitter = require('../utils/appEventEmitter');
const { addEmailJob } = require('../queues/emailQueue');

appEventEmitter.on('user:registered', async (user) => {
  console.log(`[Event-Listener] Caught 'user:registered' event for ${user.email}...`);
  await addEmailJob(user.email, 'Welcome!', 'Thank you for signing up!');
});

appEventEmitter.on('user:registered', (user) => {
  console.log(`[Event-Listener] [Audit Log] SECURITY: User registration registered for ID: ${user.id}`);
});
```

### Event Dispatching: [authController.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/controllers/v1/authController.js)
When registration succeeds, we emit the event:
```javascript
const appEventEmitter = require('../../utils/appEventEmitter');
appEventEmitter.emit('user:registered', {
  id: user._id,
  name: user.name,
  email: user.email,
});
```

### Server Integration: [server.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/server.js)
Loads listeners on startup so they bind to the event emitter before events are dispatched:
```javascript
require('./listeners/userListeners');
```

---

## 3. Verification & Log Streams
When registering a new user via `POST /api/v1/auth/register`, console streams log the execution order:
```log
[AuthController] Emitting user:registered event (fallback path) for user: eeuser_1780640311@example.com
[Event-Listener] Caught 'user:registered' event for eeuser_1780640311@example.com. Dispatching Welcome Email job...
[Event-Listener] [Audit Log] SECURITY: User registration registered for ID: 6a226a37305d58286686fca2 at 2026-06-05T06:18:32.313Z
[Event-Listener] Welcome Email job successfully queued. Job ID: 3
[Worker] Started processing job 3 - sending email to eeuser_1780640311@example.com...
[Worker] Successfully completed job 3 - email sent to eeuser_1780640311@example.com
[Worker] Job 3 completed successfully
```
Note how the event listener automatically bridges into BullMQ background queues for out-of-process job execution!
