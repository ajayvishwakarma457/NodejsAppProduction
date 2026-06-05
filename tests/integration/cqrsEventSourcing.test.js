const request = require('supertest');
const app = require('../../src/app');
const EventStore = require('../../src/models/eventStoreModel');
const UserReadView = require('../../src/models/userReadViewModel');

// Mock mongoose models
jest.mock('../../src/models/eventStoreModel');
jest.mock('../../src/models/userReadViewModel');

describe('CQRS and Event Sourcing Integration Tests', () => {
  let eventsDb = [];
  let readViewDb = [];

  beforeEach(() => {
    jest.clearAllMocks();
    eventsDb = [];
    readViewDb = [];

    // --- Mock EventStore Behavior ---
    EventStore.mockImplementation((data) => {
      const eventInstance = {
        ...data,
        save: jest.fn().mockImplementation(async () => {
          // Check compound unique index { aggregateId, version } for OCC simulation
          const duplicate = eventsDb.find(
            (e) => e.aggregateId === data.aggregateId && e.version === data.version
          );
          if (duplicate) {
            const err = new Error('Duplicate key error');
            err.code = 11000;
            throw err;
          }
          eventsDb.push({ ...data, timestamp: new Date() });
          return eventInstance;
        }),
      };
      return eventInstance;
    });

    EventStore.find.mockImplementation((query) => {
      return {
        sort: jest.fn().mockImplementation((sortQuery) => {
          let results = eventsDb.filter((e) => e.aggregateId === query.aggregateId);
          if (sortQuery.version === 1) {
            results.sort((a, b) => a.version - b.version);
          }
          return Promise.resolve(results);
        }),
      };
    });

    // --- Mock UserReadView Behavior ---
    UserReadView.create.mockImplementation(async (data) => {
      const record = { ...data, lastUpdated: new Date() };
      readViewDb.push(record);
      return record;
    });

    UserReadView.findOne.mockImplementation(async (query) => {
      // e.g. { email, isDeleted: false }
      return readViewDb.find((u) => {
        if (query.email && u.email !== query.email) return false;
        if (query._id && u._id !== query._id) return false;
        if (query.isDeleted === false && u.isDeleted) return false;
        return true;
      }) || null;
    });

    UserReadView.findById.mockImplementation(async (id) => {
      const user = readViewDb.find((u) => u._id === id);
      if (!user) return null;
      // Add virtual getter simulation for Jest matching
      return {
        ...user,
        toJSON: () => ({ ...user, id: user._id }),
      };
    });

    UserReadView.findOneAndUpdate.mockImplementation(async (query, update) => {
      const idx = readViewDb.findIndex((u) => {
        if (u._id !== query._id) return false;
        if (query.version && query.version.$lt !== undefined && u.version >= query.version.$lt) return false;
        return true;
      });

      if (idx === -1) return null;

      const current = readViewDb[idx];
      const updated = {
        ...current,
        ...update.$set,
        lastUpdated: new Date(),
      };
      readViewDb[idx] = updated;
      return updated;
    });

    UserReadView.findByIdAndUpdate.mockImplementation(async (id, state, options) => {
      const idx = readViewDb.findIndex((u) => u._id === id);
      const record = { ...state, _id: id, lastUpdated: new Date() };
      if (idx !== -1) {
        readViewDb[idx] = record;
      } else {
        readViewDb.push(record);
      }
      return record;
    });

    UserReadView.find.mockImplementation((query) => {
      const results = readViewDb.filter((u) => {
        if (query.isDeleted === false && u.isDeleted) return false;
        return true;
      });
      // Mock mongoose lean() or thenable structure
      return Promise.resolve(results.map(u => ({ ...u, id: u._id })));
    });
  });

  describe('Commands (Write Stack)', () => {
    test('should process CREATE user command, store USER_CREATED event, and update Read View', async () => {
      const res = await request(app)
        .post('/api/v1/cqrs-users')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'admin',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.version).toBe(1);

      const userId = res.body.data.id;
      expect(userId).toBeDefined();

      // Verify event store has the event
      expect(eventsDb.length).toBe(1);
      expect(eventsDb[0]).toMatchObject({
        aggregateId: userId,
        eventType: 'USER_CREATED',
        version: 1,
        eventData: { name: 'Jane Doe', email: 'jane@example.com', role: 'admin' },
      });

      // Verify read view matches
      expect(readViewDb.length).toBe(1);
      expect(readViewDb[0]).toMatchObject({
        _id: userId,
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'admin',
        version: 1,
        isDeleted: false,
      });
    });

    test('should prevent creating user if email already exists in read view', async () => {
      readViewDb.push({
        _id: 'existing-id',
        name: 'Existing User',
        email: 'jane@example.com',
        role: 'user',
        version: 1,
        isDeleted: false,
      });

      const res = await request(app)
        .post('/api/v1/cqrs-users')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('email already exists');
    });

    test('should process UPDATE command, add USER_UPDATED event, and update read model', async () => {
      const userId = 'user-abc';
      readViewDb.push({
        _id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        version: 1,
        isDeleted: false,
      });

      const res = await request(app)
        .patch(`/api/v1/cqrs-users/${userId}`)
        .send({
          name: 'Johnathan Doe',
          expectedVersion: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.version).toBe(2);

      // Verify new event is appended
      expect(eventsDb.length).toBe(1);
      expect(eventsDb[0]).toMatchObject({
        aggregateId: userId,
        eventType: 'USER_UPDATED',
        version: 2,
        eventData: { name: 'Johnathan Doe', email: 'john@example.com' },
      });

      // Verify read view is updated
      expect(readViewDb[0].name).toBe('Johnathan Doe');
      expect(readViewDb[0].version).toBe(2);
    });

    test('should reject UPDATE command if expectedVersion does not match current version (OCC check)', async () => {
      const userId = 'user-abc';
      readViewDb.push({
        _id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        version: 2, // Current version is 2
        isDeleted: false,
      });

      const res = await request(app)
        .patch(`/api/v1/cqrs-users/${userId}`)
        .send({
          name: 'Johnathan Doe',
          expectedVersion: 1, // Stale version 1 sent
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Concurrency Exception');
    });
  });

  describe('Queries & Replays', () => {
    test('should retrieve active users using GET query', async () => {
      readViewDb.push(
        { _id: 'u1', name: 'User 1', email: 'u1@ex.com', role: 'user', version: 1, isDeleted: false },
        { _id: 'u2', name: 'User 2', email: 'u2@ex.com', role: 'user', version: 1, isDeleted: true } // Deleted
      );

      const res = await request(app).get('/api/v1/cqrs-users');

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data[0].name).toBe('User 1');
    });

    test('should successfully replay event stream to reconstruct query read views from scratch', async () => {
      const userId = 'rebuild-123';

      // 1. Populate event log with sequential mutations
      eventsDb.push(
        { aggregateId: userId, eventType: 'USER_CREATED', eventData: { name: 'Alice', email: 'alice@ex.com', role: 'user' }, version: 1 },
        { aggregateId: userId, eventType: 'USER_UPDATED', eventData: { name: 'Alice Cooper', email: 'alice@ex.com', role: 'admin' }, version: 2 }
      );

      // 2. Read view is currently empty
      expect(readViewDb.length).toBe(0);

      // 3. Trigger replay endpoint
      const res = await request(app)
        .post(`/api/v1/cqrs-users/${userId}/replay`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.name).toBe('Alice Cooper');
      expect(res.body.data.role).toBe('admin');
      expect(res.body.data.version).toBe(2);

      // 4. Verify read view was populated by projection replay
      expect(readViewDb.length).toBe(1);
      expect(readViewDb[0]).toMatchObject({
        _id: userId,
        name: 'Alice Cooper',
        role: 'admin',
        version: 2,
        isDeleted: false,
      });
    });
  });
});
