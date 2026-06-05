# Inter-service Communication (REST, gRPC, Message Queues)

This document describes the design, implementation, and setup of the three primary inter-service communication patterns implemented to facilitate exchange of data and events between our decomposed microservices: **API Gateway**, **User Identity Service**, and **Notification Service**.

---

## 1. Architectural Overview

To achieve an optimal balance of request speed, service decoupling, and reliability, we implement three communication paradigms:

1. **REST (Synchronous HTTP Proxy)**: The API Gateway accepts client requests and forwards them transparently to the respective microservice.
2. **gRPC (Synchronous High-Performance RPC)**: High-speed, typed communication between the API Gateway and the User Service to fetch user information directly via Protocol Buffers.
3. **Message Queues (Asynchronous Events)**: Event-driven communication where the User Service publishes tasks to Redis, and the Notification Service asynchronously processes them via BullMQ.

```mermaid
graph TD
    Client[Client / Tester]
    Gateway[API Gateway - Port 6000]
    UserService[User Service - Port 6001 / gRPC 50051]
    NotificationService[Notification Service - Port 6002]
    Redis[(Redis Queue)]

    Client -->|1. HTTP REST GET /api/v1/users| Gateway
    Gateway -->|2. HTTP Proxy / REST| UserService

    Client -->|3. HTTP GET /api/v1/grpc-user/:id| Gateway
    Gateway -->|4. gRPC client.getUserInfo()| UserService

    UserService -->|5. Add job to emailQueue| Redis
    Redis -->|6. Asynchronous process email| NotificationService
```

---

## 2. Communication Implementations

### A. REST (Synchronous HTTP Proxy forwarding)
API Gateway acts as a reverse proxy routing requests to downstream microservices using `express-http-proxy`. This decouples the public clients from private microservice IP/ports.

* **Routing Route**: `GET /api/v1/users` is forwarded to User Service at port `6001`.
* **Path translation**:
```javascript
app.use('/api/v1/users', proxy(USER_SERVICE_URL, {
  proxyReqPathResolver: (req) => `/api/v1/users${req.url}`,
}));
```

---

### B. gRPC (Synchronous RPC / Protocol Buffers)
For internal service-to-service calls where speed, compact serialization, and strict contract definitions are required, we use gRPC.

#### 1. Protocol Buffer Schema (`user.proto`)
The data structure and remote procedure signatures are defined in a `.proto` file:
```protobuf
syntax = "proto3";

package user;

service UserService {
  rpc GetUserInfo (UserRequest) returns (UserResponse);
}

message UserRequest {
  string id = 1;
}

message UserResponse {
  string id = 1;
  string name = 2;
  string email = 3;
  string role = 4;
  string createdAt = 5;
}
```

#### 2. gRPC Server (User Identity Service)
Runs side-by-side with the Express app in `microservices/user-service/index.js`, binding to port `50051` using `@grpc/grpc-js` and `@grpc/proto-loader`. It queries MongoDB and returns binary protobuf payloads.

#### 3. gRPC Client (API Gateway)
Exposes an edge route `GET /api/v1/grpc-user/:id`. When called, it invokes the gRPC server synchronously to retrieve user details and replies to the client.

```javascript
userClient.getUserInfo({ id }, (err, response) => {
  if (err) {
    // Error handling ...
  }
  return res.status(200).json({ status: 'success', data: response });
});
```

---

### C. Message Queues (Asynchronous Events / BullMQ)
When services need to trigger slow processes (like sending emails) without blocking user-facing requests, event publication is handled via BullMQ backed by a Redis datastore.

1. **Job Publisher**: Upon registration, the User Service emits a local event `user:registered`.
2. **Event Dispatcher**: The listener catches the event and queues a job in Redis under the `emailQueue`:
   ```javascript
   const job = await addEmailJob(user.email, 'Welcome!', 'Hi there!', 2);
   ```
3. **Queue Worker**: The Notification Service spins up a background BullMQ Worker that picks up the job from Redis and processes it asynchronously.
4. **Resiliency & DLQ**: Failed notifications are retried dynamically. If they exhaust the allowed attempts, the worker automatically persists the job metadata to a Dead Letter Queue (DLQ) in MongoDB.

---

## 3. How to Verify

1. Run the entire microservice architecture:
   ```bash
   npm run start:microservices
   ```
2. Create or find a user ID inside the MongoDB database.
3. Fetch user details over the REST API proxy:
   ```bash
   curl http://localhost:6000/api/v1/users/<id>
   ```
4. Fetch user details over gRPC (initiated from Gateway):
   ```bash
   curl http://localhost:6000/api/v1/grpc-user/<id>
   ```
5. Create a user over `POST http://localhost:6000/api/v1/users` and watch the `gateway` and `notif` console logs to observe the asynchronous worker consuming the email dispatch task.
