# Hexagonal Architecture Guide (Ports & Adapters)

This document describes the design and integration of **Hexagonal Architecture (Ports and Adapters)** inside our Node.js codebase.

---

## 1. Architectural Strategy

Hexagonal Architecture isolates core business logic (Domain/Entities) from external components (frameworks, HTTP routers, databases, third-party libraries).

```
                 Driving (Primary) Adapters
                      (HTTP Routes, CLI)
                              │
                              ▼
     ┌─────────────────────────────────────────────────┐
     │                    Hexagon                      │
     │                                                 │
     │               Inbound Ports                     │
     │              (Use-case logic)                   │
     │                      │                          │
     │                      ▼                          │
     │              ┌──────────────┐                   │
     │              │ Core Domain  │                   │
     │              │   Entities   │                   │
     │              └──────┬───────┘                   │
     │                      │                          │
     │                      ▼                          │
     │               Outbound Ports                    │
     │            (Repository Contracts)               │
     │                                                 │
     └──────────────────────┬──────────────────────────┘
                            │
                            ▼
                Driven (Secondary) Adapters
                    (Mongoose MongoDB)
```

- **Domain/Entities**: Pure, framework-free JavaScript classes containing core model attributes and validations.
- **Ports**: Definition contracts specifying what the core logic requires.
- **Adapters**: The external components that connect to these ports:
  - **Primary (Inbound)**: Triggers use-cases (e.g. Express HTTP controllers, CLI commands).
  - **Secondary (Outbound)**: Implements actions required by the domain (e.g. database adapters, file storage clients).

---

## 2. Directory Layout

The Hexagonal layout is structured as follows:

```
src/
├── domain/
│   ├── userEntity.js                   # Pure Domain Entity
│   └── ports/
│       └── userRepositoryPort.js       # Driven Port definition contract
├── adapters/
│   └── db/
│       └── mongoUserRepositoryAdapter.js # Driven Outbound Database Adapter
├── services/
│   └── hexUserService.js               # Application Service use-case orchestration
└── controllers/
    └── v1/
        └── hexUserController.js        # Driving Inbound HTTP Adapter
```

---

## 3. Component Details

### A. Driven Port Contract (`src/domain/ports/userRepositoryPort.js`)
Defines the required methods database adapters must satisfy. It throws errors if invoked directly:
```javascript
class UserRepositoryPort {
  async save(userEntity) { throw new Error('Not implemented'); }
  async findById(id) { throw new Error('Not implemented'); }
}
```

### B. Outbound Database Adapter (`src/adapters/db/mongoUserRepositoryAdapter.js`)
Implements the outbound port contract using the Mongoose model, translating raw documents to/from pure domain entities:
```javascript
class MongoUserRepositoryAdapter extends UserRepositoryPort {
  constructor({ userModel }) {
    super();
    this.userModel = userModel;
  }
  async save(userEntity) { /* Mongoose queries + domain mapping */ }
}
```

### C. Application Service Orchestration (`src/services/hexUserService.js`)
Communicates only with ports, executing business rules on domain entities:
```javascript
class HexUserService {
  constructor({ userRepositoryPort, logger }) {
    this.userRepositoryPort = userRepositoryPort;
    this.logger = logger;
  }
  async createUser(userData) {
    const userEntity = new UserEntity(userData);
    userEntity.validate();
    return this.userRepositoryPort.save(userEntity);
  }
}
```

---

## 4. Key Benefits

- **Technology Agnosticism**: If we swap MongoDB for PostgreSQL, we simply write a new Outbound Adapter implementing `UserRepositoryPort` and register it in `container.js`. The core application service and domain code remain untouched.
- **Pure Testing**: Domain logic unit tests do not require mock schemas or database runtimes. We can inject mock ports directly into service constructors.
