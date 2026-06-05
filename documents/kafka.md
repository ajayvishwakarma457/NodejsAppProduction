# Apache Kafka (Partitions, Consumer Groups, Offsets)

This document details the architectural design, setup procedures, and code integrations for dynamic messaging using **Apache Kafka** (partitions, consumer groups, offsets) to establish high-throughput, ordered activity streams.

---

## 1. Architectural Concepts

Apache Kafka is a distributed event-streaming platform structured as a partitioned commit log:

* **Producer**: Publishes events to topics. By providing a partition key (e.g. `userId`), the producer ensures that all events sharing this key land in the same partition, preserving absolute ordering.
* **Topic**: A category or feed name to which events are published.
* **Partitions**: Topics are split into partitions across cluster nodes. This scales write/read limits horizontally.
* **Consumer Group**: Consumers sharing a group ID work collaboratively. Each partition in a topic is consumed by exactly one group member, preventing duplicate processing.
* **Offsets**: The incremental placeholder ID assigned to each record in a partition. Consumers commit offsets to track ingestion states and recover without event loss.

```
[Producer] ---> [Topic: user-activities]
                   |---> [Partition 0] (Offset 0, 1, 2) ---> Consumer A (Group: notification-group)
                   |---> [Partition 1] (Offset 0, 1)    ---> Consumer B (Group: notification-group)
```

---

## 2. Dynamic messaging Setup

We implemented a **User Activity Event Stream** utilizing the `kafkajs` client library.

### A. Client Configuration (`src/config/kafka.js`)
Configures the Kafka broker connection pool and maps native KafkaJS log levels to Winston:

```javascript
const { Kafka } = require('kafkajs');
const kafka = new Kafka({
  clientId: 'production-platform',
  brokers: ['localhost:9092'],
});
```

### B. Producer (`src/messaging/kafkaProducer.js`)
Manages broker connection states and publishes stringified payloads utilizing partition keys:

```javascript
const result = await producer.send({
  topic,
  messages: [{
    key: String(key), // Routing key determines the target partition
    value: JSON.stringify(payload)
  }],
});
```

### C. Consumer Group Ingestion (`src/messaging/kafkaConsumer.js`)
Subscribes to topics under a unified consumer group. Kafka automatically handles partition balancing. Offsets are committed periodically on successful execution:

```javascript
const consumer = kafka.consumer({ groupId });
await consumer.connect();
await consumer.subscribe({ topic, fromBeginning: false });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const key = message.key.toString();
    const value = JSON.parse(message.value.toString());
    
    // Process message logic ...
  },
});
```

---

## 3. Microservice Integrations

1. **User Identity Service (Producer)**: On onboarding registration, the listener publishes the activity payload using `userId` as the partition routing key to guarantee chronological ordering:
   ```javascript
   await kafkaProducer.publish('user-activities', userId, {
     userId,
     email: user.email,
     activity: 'USER_REGISTERED',
   });
   ```
2. **Notification Service (Consumer)**: On boot, spins up the consumer group subscribing to `user-activities` to log event flows.

---

## 4. Verification & Testing

### Automated Integration Tests
Verify Kafka client connection, partitioned send, and consumer offset commits:
```bash
npm test tests/integration/kafka.test.js
```

### Local Setup via Docker Compose
To run a local Apache Kafka broker along with ZooKeeper, use the following `docker-compose.yml` configuration:

```yaml
version: '3'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.3.0
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.3.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_INTERNAL:PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

Run command:
```bash
docker-compose up -d
```
