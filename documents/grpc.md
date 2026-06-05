# gRPC (with Protocol Buffers & Client-Server Streaming)

This document explains the architectural design, setup procedures, and code integrations for **gRPC with Node.js** utilizing Protocol Buffers, all four streaming paradigms, and REST compatibility.

---

## 1. Architectural Concepts

gRPC is a modern open-source high-performance RPC framework developed by Google:

* **Protocol Buffers**: Language-neutral, platform-neutral, extensible mechanism for serializing structured data.
* **HTTP/2 Transport**: Lowers network overhead with multiplexed requests over a single connection, header compression, and full bidirectional streaming.
* **Paradigms**:
  1. **Unary RPC**: Single request and single response.
  2. **Server-Streaming RPC**: Client sends a single request and gets back a read-only stream to read consecutive messages.
  3. **Client-Streaming RPC**: Client writes a sequence of messages and sends them to the server using a write-only stream. Once finished, it waits for the server to read them and return a single summary response.
  4. **Bidirectional-Streaming RPC**: Both sides send a sequence of messages using a read-write stream. The two streams operate independently.

```
[gRPC Client] ===== (Request) ====> [gRPC Server] (Unary)
[gRPC Client] <==== (Stream...) === [gRPC Server] (Server Streaming)
[gRPC Client] === (Stream...) ====> [gRPC Server] (Client Streaming)
[gRPC Client] <=== (Bi-Stream) ===> [gRPC Server] (Bidirectional)
```

---

## 2. Protocol Buffer Specification (`src/protos/user.proto`)

Exposes service definitions and structured payload types:

```protobuf
syntax = "proto3";

package user;

service UserService {
  rpc GetUser (UserRequest) returns (UserResponse);
  rpc StreamUserActivities (ActivityStreamRequest) returns (stream ActivityResponse);
  rpc UploadAuditLogs (stream AuditLogRequest) returns (UploadSummaryResponse);
  rpc RealtimeChat (stream ChatMessage) returns (stream ChatMessage);
}
```

---

## 3. Server & Client Implementations

### A. gRPC Server (`src/grpc/grpcServer.js`)
Configures, registers, and starts the RPC server:

```javascript
const server = new grpc.Server();
server.addService(userProto.UserService.service, {
  getUser: (call, callback) => { ... },
  streamUserActivities: (call) => { ... },
  uploadAuditLogs: (call, callback) => { ... },
  realtimeChat: (call) => { ... }
});
server.bindAsync('127.0.0.1:50051', ...);
```

### B. gRPC Client (`src/grpc/grpcClient.js`)
Initiates connection to the backend gRPC port:

```javascript
const grpcClient = new userProto.UserService(
  '127.0.0.1:50051',
  grpc.credentials.createInsecure()
);
```

---

## 4. REST Compatibility Proxy (Gateway)

To allow client access without raw HTTP/2 gRPC adapters, we implement a **REST Gateway** proxy mounted at `/api/v1/grpc-users`:

* **GET `/api/v1/grpc-users/:id`**: Proxies REST parameters to Unary gRPC call.
* **GET `/api/v1/grpc-users/:id/activities`**: Buffers Server-Streaming RPC messages into an HTTP JSON Array payload.
* **POST `/api/v1/grpc-users/upload-logs`**: Pipes a JSON array of HTTP requests as consecutive message chunks to Client-Streaming RPC handler, returning a final processed summary.

---

## 5. Verification & Testing

Verify unary calls, streaming, and HTTP gateway operations:
```bash
npm test tests/integration/grpc.test.js
```
