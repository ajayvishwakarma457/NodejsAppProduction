# RabbitMQ (Exchanges, Queues, Routing Keys)

This document details the architectural design, setup procedures, and code integrations for dynamic messaging using **RabbitMQ** (exchanges, queues, routing keys) to establish microservice-to-microservice message streams.

---

## 1. Architectural Concepts

RabbitMQ is an enterprise-grade message broker. Unlike simple queues that route messages directly to consumers, RabbitMQ uses a **Message Exchange** architecture:

* **Producer**: The client app sending messages.
* **Exchange**: The post office. It receives messages from producers and routes them to queues based on routing keys, headers, or bindings.
* **Binding**: The link between an exchange and a queue.
* **Routing Key**: A message attribute evaluated by the exchange to decide target queue routing.
* **Queue**: The buffer storing messages until consumers pull them.
* **Consumer**: The client app receiving and processing messages.

```
[Producer] ---> (Exchange) ==[Routing Key]==> [Queue] ---> [Consumer]
```

### Exchange Types
1. **Direct**: Routes messages to queues based strictly on an exact match between the message routing key and the queue binding key.
2. **Fanout**: Copies and routes messages to all queues bound to it, ignoring routing keys.
3. **Topic**: Routes messages based on wildcard matches between routing keys (using symbols like `*` for one word, or `#` for zero or more words).
4. **Headers**: Routes messages based on header attributes instead of routing keys.

---

## 2. Dynamic messaging Setup

We implemented a **Security Audit Log Pipeline** utilizing a **Direct Exchange** pattern to route events asynchronously.

### A. Producer (`src/messaging/rabbitmqProducer.js`)
Asserts the exchange, serializes the JSON payload, and publishes the message with persistent options so it survives broker crashes:

```javascript
const channel = await rabbitmq.getChannel();
await channel.assertExchange(exchangeName, exchangeType, { durable: true });

channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(message)), {
  persistent: true,
});
```

### B. Consumer (`src/messaging/rabbitmqConsumer.js`)
Asserts the target queue, binds it to the exchange with the routing key, and processes the payload. It forces explicit **Acknowledgements (ACK)**:

```javascript
const channel = await rabbitmq.getChannel();
await channel.assertExchange(exchangeName, exchangeType, { durable: true });
await channel.assertQueue(queueName, { durable: true });
await channel.bindQueue(queueName, exchangeName, routingKey);

await channel.consume(queueName, async (msg) => {
  if (msg !== null) {
    try {
      await onMessage(JSON.parse(msg.content.toString()), msg.fields.routingKey);
      channel.ack(msg); // Send Acknowledge
    } catch (err) {
      channel.nack(msg, false, true); // NACK: Requeue on failure
    }
  }
});
```

---

## 3. Microservice Integrations

1. **User Identity Service (Producer)**: On registration, the local listener publishes an audit event to exchange `security_exchange` with routing key `user.register`:
   ```javascript
   await rabbitmqProducer.publish('security_exchange', 'direct', 'user.register', {
     userId,
     action: 'USER_REGISTERED'
   });
   ```
2. **Notification Service (Consumer)**: On startup, binds `audit_log_queue` to `security_exchange` with key `user.register` to consume and log logs.

---

## 4. Verification & Testing

### Automated Integration Tests
Verify exchange assertions, dynamic queue bindings, and ACK confirmations:
```bash
npm test tests/integration/rabbitmq.test.js
```

### Local Setup via Docker
To run RabbitMQ locally:
```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```
Access the management console at [http://localhost:15672](http://localhost:15672) (Default User/Password: `guest` / `guest`) to inspect exchange charts, bindings, and message queues dynamically.
