# NATS (Lightweight Pub/Sub)

This document details the architectural design, setup procedures, and code integrations for lightweight messaging using **NATS** pub/sub to establish transient, real-time message broadcasting between microservices.

---

## 1. Architectural Concepts

NATS is a lightweight, cloud-native message distribution technology designed for fast, simple communication:

* **Subject-Based Routing**: Messages are addressed by subject strings (e.g. `user.notifications`).
* **Publish-Subscribe**: Publishers send messages to subjects, and NATS automatically routes them to active subscribers matching that subject.
* **Fire-and-Forget (Transient)**: Core NATS operates as an in-memory distribution layer. If no active subscriber is connected when a message is published, the message is dropped. This is ideal for ephemeral events like push alerts, real-time status feeds, and user notifications where persistency overhead is not required.

```
[Publisher] ---> [Subject: user.notifications]
                       |---> Subscriber A (Notification Service)
                       |---> Subscriber B (Analytics Service)
```

---

## 2. Pub/Sub Setup

We implemented a **User Notification Event Stream** using the standard `nats` client library.

### A. Client Configuration (`src/config/nats.js`)
Handles the client lifecycle connection establishment to NATS server endpoints:

```javascript
const { connect } = require('nats');
const natsConnection = await connect({ servers: 'nats://localhost:4222' });
```

### B. Publisher (`src/messaging/natsPublisher.js`)
Publishes event objects encoded as byte arrays via JSON Codec:

```javascript
const { JSONCodec } = require('nats');
const jc = JSONCodec();

await nc.publish(subject, jc.encode(payload));
```

### C. Subscriber (`src/messaging/natsSubscriber.js`)
Subscribes to topics and runs async event loops parsing binary message streams to javascript objects:

```javascript
const sub = nc.subscribe(subject);
for await (const message of sub) {
  const payload = jc.decode(message.data);
  // process notification payload ...
}
```

---

## 3. Microservice Integrations

1. **User Identity Service (Publisher)**: On onboarding registration, the listener publishes a transient event to NATS:
   ```javascript
   await natsPublisher.publish('user.notifications', {
     userId,
     email: user.email,
     name: user.name,
     type: 'WELCOME_NOTIFICATION',
   });
   ```
2. **Notification Service (Subscriber)**: On boot, registers the subscriber listening to the `user.notifications` subject to log and push transient welcome notifications.

---

## 4. Verification & Testing

### Automated Integration Tests
Verify NATS connection establishment, payload serialization, and event subscription:
```bash
npm test tests/integration/nats.test.js
```

### Local Setup via Docker Compose
To run NATS server locally, use the following `docker-compose.yml` service block:

```yaml
version: '3'
services:
  nats:
    image: nats:latest
    ports:
      - "4222:4222"   # Client port
      - "8222:8222"   # Management HTTP monitoring port
```

Run command:
```bash
docker-compose up -d
```
