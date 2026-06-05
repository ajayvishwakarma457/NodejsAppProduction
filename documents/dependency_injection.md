# Dependency Injection Guide

This document describes the Dependency Injection (DI) architectural pattern implemented in the application using the **Awilix** container framework.

---

## 1. Architectural Strategy

Traditionally, Node.js applications import modules directly using `require()`, leading to tight coupling between services, models, and controllers. This makes mocking dependencies during testing complex and limits architectural flexibility.

By introducing a **DI Container**, dependencies are declared and registered centrally. Classes express their requirements as constructor parameters, and the container automatically instantiates and injects them at runtime.

---

## 2. Directory Layout

The DI integration is structured as follows:

```
src/
├── config/
│   └── container.js          # Centrally registers all components (logger, models, services)
├── services/
│   └── diUserService.js      # Service class with constructor dependency injection
├── controllers/
│   └── v1/
│       └── diUserController.js # Controller resolving service dynamically from container
└── routes/
    └── v1/
        └── diUserRoutes.js   # Mounts route endpoints to diUserController
```

---

## 3. Implementation Mappings

### A. DI Container Configuration (`src/config/container.js`)
Configures the Awilix container, mapping global objects and classes:
- Winston `logger` is registered as a static value.
- Mongoose `userModel` is registered as a static value.
- `diUserService` is registered as an auto-resolved class with a `singleton` lifetime (instantiated once, then cached).

### B. Service Constructor Injection (`src/services/diUserService.js`)
The service receives its database models and logging utilities directly as constructor parameters:
```javascript
class DiUserService {
  constructor({ userModel, logger }) {
    this.userModel = userModel;
    this.logger = logger;
  }
  // CRUD actions using this.userModel and this.logger...
}
```

### C. Controller Resolver (`src/controllers/v1/diUserController.js`)
Controllers resolve service instances dynamically from the container:
```javascript
const diUserService = container.resolve('diUserService');
```

---

## 4. Advantages of DI in this Project

1. **Extreme Testability**:
   We can instantiate classes manually in tests without executing DB connections or mocking node require paths. Mock versions of logger or mongoose models can simply be passed as parameters into the constructor.
   ```javascript
   const service = new DiUserService({
     userModel: mockUserModel,
     logger: mockLogger
   });
   ```
2. **Decoupled Architecture**:
   Simplifies swapping out models, logging libraries, or payment gateways without modifying business logic code across the project.
