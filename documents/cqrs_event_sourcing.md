# Event Sourcing and CQRS Patterns

This document explains the architectural design, implementation details, and codebase structure for **Event Sourcing** and **CQRS (Command Query Responsibility Segregation)** patterns within our User Domain context.

---

## 1. Architectural Concepts

Traditional applications store the *current state* of records (e.g. updating a table row). The Event Sourcing and CQRS patterns decouple the write and read models for higher scale, auditable mutation trails, and complex concurrency checks:

* **Event Sourcing**: The truth of the system is stored as an append-only log of immutable history events (`USER_CREATED`, `USER_UPDATED`, `USER_DELETED`). Current state is derived by replaying the sequence of events.
* **CQRS**: Decouples the mutation (Commands) from retrieval (Queries):
  * **Command Stack (Write)**: Handles changes by generating event records, validating business boundaries, appending events to the store, and running projections.
  * **Query Stack (Read)**: Serves reading operations by querying optimized, denormalized read views (`UserReadView`) without hitting the write model.
* **Optimistic Concurrency Control (OCC)**: Each command check validates the expected state version against the current version. Mongoose enforces unique compound constraints on `{ aggregateId, version }` to reject duplicate race-condition writes.
* **Projections**: Event handlers that listen to incoming events and apply incremental updates to the denormalized read views.
* **Event Replay**: Rebuilding read views from scratch by querying the Event Store for all historical events of an aggregate and processing state transitions sequentially.

```
[Write Command] ---> [Command Handler] ---> [Event Store (Write DB)]
                                                    |
                                            (Project Event)
                                                    v
[Read Query]    <--- [Query Handler]   <--- [Read View (Read DB)]
```

---

## 2. Codebase Structure

We implemented a full Event-Sourced CQRS pipeline for Users:

### A. Event Store Schema (`src/models/eventStoreModel.js`)
Stores immutable event logs. The database level compound index prevents out-of-order writes and race conditions:

```javascript
eventStoreSchema.index({ aggregateId: 1, version: 1 }, { unique: true });
```

### B. Read View Schema (`src/models/userReadViewModel.js`)
An optimized, denormalized read model optimized for performant user queries:

```javascript
const UserReadView = mongoose.model('UserReadView', userReadViewSchema);
```

### C. Write Command Handler (`src/services/userCommandHandler.js`)
Handles write actions. Fetches read-model versions, executes business rules, and appends to the event store:

```javascript
const event = new EventStore({
  aggregateId,
  eventType: 'USER_CREATED',
  eventData: { name, email },
  version: 1
});
await event.save();
await userProjection.handleEvent(event);
```

### D. Read Query Handler (`src/services/userQueryHandler.js`)
Retrieves records strictly from the optimized read view models:

```javascript
const userQueryHandler = {
  getUserById: async (id) => {
    return await UserReadView.findOne({ _id: id, isDeleted: false });
  }
};
```

### E. Projection Engine & Replay (`src/projections/userProjection.js`)
Increments read views reactively. Supports replaying events to reconstruct states:

```javascript
const events = await EventStore.find({ aggregateId }).sort({ version: 1 });
let state = {};
for (const event of events) {
  // Reconstruct state ...
}
await UserReadView.findByIdAndUpdate(aggregateId, state, { upsert: true });
```

---

## 3. Endpoints & Route Mappings

CQRS User Routes are mounted under `/api/v1/cqrs-users`:

* **POST `/api/v1/cqrs-users`**: Create User Command
* **PATCH `/api/v1/cqrs-users/:id`**: Update User Details Command (OCC checks using `expectedVersion`)
* **DELETE `/api/v1/cqrs-users/:id`**: Delete User Command (OCC checks)
* **GET `/api/v1/cqrs-users`**: Retrieve all active users Query
* **GET `/api/v1/cqrs-users/:id`**: Retrieve user details Query
* **POST `/api/v1/cqrs-users/:id/replay`**: Force event replay to reconstruct/rebuild the read model state

---

## 4. Verification & Testing

Verify writing stack, optimistic locking, projections, queries, and stream replaying by running the test suite:
```bash
npm test tests/integration/cqrsEventSourcing.test.js
```
