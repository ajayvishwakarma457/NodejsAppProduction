# Repository and Service Layer Pattern Guide

This document describes the implementation of the **Repository and Service Layer pattern** inside the application.

---

## 1. Architectural Strategy

The Repository and Service Layer pattern isolates database execution details from high-level business rules:

```
┌──────────────────┐
│  API Controller  │ (Handles REST/gRPC request context)
└────────┬─────────┘
         │ Resolves via DI container
         ▼
┌──────────────────┐
│  Service Layer   │ (Houses business logic, completely database-agnostic)
└────────┬─────────┘
         │ Injected into constructor
         ▼
┌──────────────────┐
│ Repository Layer │ (Encapsulates Mongoose/DB queries)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Database Model  │ (Mongoose Schema definition)
└──────────────────┘
```

---

## 2. Directory Layout

The implementation files are located under:

```
src/
├── config/
│   └── container.js          # Registers model, repository, and service classes in the container
├── repositories/
│   └── userRepository.js     # User Repository class managing direct Mongoose queries
├── services/
│   └── diUserService.js      # User Service class implementing business operations
└── controllers/
    └── v1/
        └── diUserController.js # Controller layer invoking resolved services
```

---

## 3. Implementation Details

### A. Repository Layer (`src/repositories/userRepository.js`)
Handles database-level query logic using Mongoose schema abstractions:
```javascript
class UserRepository {
  constructor({ userModel }) {
    this.userModel = userModel;
  }

  async findAll() {
    return this.userModel.find({});
  }
  // findById, findByEmail, create...
}
```

### B. Service Layer (`src/services/diUserService.js`)
Consumes the Repository class. The service is database-agnostic and only runs business actions:
```javascript
class DiUserService {
  constructor({ userRepository, logger }) {
    this.userRepository = userRepository;
    this.logger = logger;
  }

  async getAllUsers() {
    this.logger.info('[DI Service] Retrieving all users from repository');
    return this.userRepository.findAll();
  }
}
```

---

## 4. Key Benefits

- **Database Portability**: The service layer has no references to Mongoose functions (`find`, `create`). If the data store changes to PostgreSQL or DynamoDB, only the repository code needs updating; the service layer remains unchanged.
- **Isolate Testing**: Business rule verifications can mock the repository functions directly (without mocking complex ORM query chains).
- **Separation of Concerns**: Controllers deal with HTTP response formatting; Services process domain rules; Repositories access data.
