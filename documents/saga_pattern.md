# Saga Pattern for Distributed Transactions

This document details the architectural patterns, setup procedures, and code integrations for managing distributed transactions across microservices using the **Saga Pattern** (orchestration-based and choreography-based), as well as explaining compensating rollback transactions.

---

## 1. Architectural Concepts

In a monolithic architecture, a database transaction is managed using SQL `BEGIN TRANSACTION` and `COMMIT` (ACID). However, in microservices, each service has its own database. A two-phase commit (2PC) blocks databases across services, creating high latency and tightly coupling processes.

The **Saga Pattern** solves this by breaking a distributed transaction into a sequence of **local transactions**:
* Each service performs its own local transaction.
* If a step succeeds, it triggers the next step.
* If a step fails, the Saga executes **Compensating Transactions** (rollbacks) to undo the changes made by the previous steps, maintaining eventual consistency.

```
ACID (Monolith): [Step 1 -> Step 2 -> Step 3] commit / rollback (atomic)
Saga (Microservices): [Step 1 (commit)] -> [Step 2 (commit)] -> [Step 3 (fail)] 
                      -> Trigger compensating: [Rollback Step 2] -> [Rollback Step 1]
```

---

## 2. Saga Design Variations

### A. Choreography-Based (Event-Driven)
No single controller. Instead, services react asynchronously to events emitted by other services.
* **Flow**: User Service creates a user -> Emits `user:created` event -> Notification Service worker catches event -> Sends welcome email.
* **Pros**: Decoupled, simple to add new consumers.
* **Cons**: Harder to debug, risk of cyclic dependencies, complex to visualize rollbacks.

### B. Orchestration-Based (Centralized Controller)
A dedicated coordinator service (Orchestrator) manages the transaction steps and dictates the sequence of actions and rollbacks.
* **Flow**: API Gateway calls Orchestrator -> Orchestrator commands User Service to create pending account -> Orchestrator commands Notification Service to schedule email -> If email fails, Orchestrator commands User Service to delete the account.
* **Pros**: Direct control, easy to track Saga status, simple rollback logic.
* **Cons**: Centralized complexity, single point of failure if the orchestrator crashes.

---

## 3. Custom Node.js Orchestrator Implementation

We implemented a centralized **SagaOrchestrator** engine managing step registries and compensating rollbacks:

### A. Orchestrator Logic (`src/utils/sagaOrchestrator.js`)
Handles the sequential execution of actions. If a failure occurs, it executes the compensating rollbacks in reverse order:

```javascript
class SagaOrchestrator {
  static async runUserOnboarding(userData) {
    const steps = [];
    let createdUser = null;

    try {
      // Step 1: Create User in PENDING state
      createdUser = await User.create({ ...userData, status: 'pending' });
      steps.push({
        name: 'CREATE_USER',
        rollback: async () => {
          await User.findByIdAndDelete(createdUser._id); // Compensating Action
        }
      });

      // Step 2: Queue Welcome Email via BullMQ
      await addEmailJob(userData.email, 'Welcome!', 'Hi!', 2);
      steps.push({
        name: 'QUEUE_EMAIL',
        rollback: async () => {} // BullMQ compensation (noop or deletion)
      });

      // Step 3: Commit User to ACTIVE state
      createdUser.status = 'active';
      await createdUser.save();

      return { success: true, user: createdUser };

    } catch (err) {
      // Trigger rollback in reverse order
      for (let i = steps.length - 1; i >= 0; i--) {
        await steps[i].rollback();
      }
      return { success: false, error: err.message };
    }
  }
}
```

### B. MongoDB Schema Integration (`src/models/userModel.js`)
We added a `status` field to represent temporary transaction states (`pending`, `active`, `failed`):

```javascript
status: {
  type: String,
  enum: ['pending', 'active', 'failed'],
  default: 'active'
}
```

### C. Public Onboarding Endpoint
Exposed an open endpoint `POST /api/v1/users/saga-register` routing registration traffic through the coordinator pipeline.

---

## 4. Verification Workflow

### Automated Tests
Run [sagaIntegration.test.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/tests/integration/sagaIntegration.test.js) to confirm both the commit and compensating logic are fully covered:
```bash
npm test tests/integration/sagaIntegration.test.js
```

### Manual Trigger
1. **Success Case**:
   ```bash
   curl -X POST http://localhost:6000/api/v1/users/saga-register \
     -H "Content-Type: application/json" \
     -d '{"name": "Saga Success", "email": "success@example.com", "password": "password123"}'
   ```
   *Result*: User is created in MongoDB with status `active`. Welcome email is enqueued.

2. **Rollback Case (Compensating)**:
   ```bash
   curl -X POST http://localhost:6000/api/v1/users/saga-register \
     -H "Content-Type: application/json" \
     -d '{"name": "Saga Fail", "email": "trigger-saga-failure@example.com", "password": "password123"}'
   ```
   *Result*: User creation is rolled back (deleted from MongoDB) due to queue dispatch error, ensuring database consistency.
