# Service Decomposition & Domain-Driven Design (DDD)

This document details the architectural layout, domain boundaries, file directories, and port mapping strategies implemented to decompose our monolithic application into isolated sub-services.

---

## 1. Domain-Driven Design (DDD) Bounded Contexts

Following Domain-Driven Design principles, we partitioned our application into three isolated contexts, separating core functionalities into clear microservices:

1. **API Gateway (Edge Layer Bounded Context)**
   * **Domain Responsibility**: The edge layer acts as the single entrypoint. It manages global cors settings, helmet headers, request correlation tracing IDs, and url version negotiation. It isolates downstream services from public security configurations and distributes requests.
   * **Path Boundaries**: Directs `/api/v1/users` and `/api/v1/auth` to the User Service, and `/api/v1/notifications` to the Notification Service.
   * **Port**: `6000`
2. **User Identity Service (Core Bounded Context)**
   * **Domain Responsibility**: Owns user entity aggregate roots, profiles, encryption routines, and JWT token signatures.
   * **Path Boundaries**: `/api/v1/users` and `/api/v1/auth` routes.
   * **Port**: `6001`
3. **Notification Service (Supporting Bounded Context)**
   * **Domain Responsibility**: Handles background workers, email queues, dispatches, and event-driven template generations.
   * **Path Boundaries**: `/api/v1/notifications` and background redis message triggers.
   * **Port**: `6002`

---

## 2. Directory Layout (Monorepo Strategy)

We configured a clean monorepo organization under a new root `microservices/` folder, allowing services to share core packages and utility libraries (like loggers and tracers) directly:

```bash
microservices/
├── api-gateway/
│   └── index.js          # Port 6000: Proxy forwarding and edge policies
├── user-service/
│   └── index.js          # Port 6001: Mongoose db connection, user controller
└── notification-service/
    └── index.js          # Port 6002: BullMQ worker processors & event listeners
```

---

## 3. Launch & Execution Configurations

We registered startup scripts inside `package.json` for service process management:

### Start API Gateway
```bash
npm run start:gateway
```

### Start User Service
```bash
npm run start:user
```

### Start Notification Service
```bash
npm run start:notif
```

### Start All Services Concurrently
Runs all three processes concurrently, prefixing logs with their respective context names (`gateway`, `user`, `notif`):
```bash
npm run start:microservices
```
