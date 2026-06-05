const request = require('supertest');
const grpc = require('@grpc/grpc-js');

// Set port to 50052 for integration tests to prevent port collision
process.env.GRPC_PORT = '50052';

const app = require('../../src/app');
const { startGrpcServer } = require('../../src/grpc/grpcServer');
const grpcClient = require('../../src/grpc/grpcClient');

describe('gRPC Client and Server Integration Tests', () => {
  let serverInstance;

  beforeAll(async () => {
    // Start local gRPC server on test port 50052
    serverInstance = await startGrpcServer(50052);
  });

  afterAll(async () => {
    // Shutdown gRPC server cleanly
    if (serverInstance) {
      await new Promise((resolve) => {
        serverInstance.tryShutdown(() => {
          resolve();
        });
      });
    }
    // Close client connection pool
    grpcClient.close();
  });

  describe('Core gRPC Channel Modes', () => {
    // 1. Unary
    test('should resolve Unary RPC (getUser)', (done) => {
      grpcClient.getUser({ id: 'grpc_user_1' }, (err, response) => {
        expect(err).toBeNull();
        expect(response.id).toBe('grpc_user_1');
        expect(response.name).toBe('gRPC User Demo');
        expect(response.email).toBe('grpc.demo@example.com');
        done();
      });
    });

    // 2. Server Streaming
    test('should consume Server Streaming RPC (streamUserActivities)', (done) => {
      const activities = [];
      const stream = grpcClient.streamUserActivities({ userId: 'user123' });

      stream.on('data', (data) => {
        activities.push(data);
      });

      stream.on('end', () => {
        expect(activities.length).toBe(3);
        expect(activities[0].activityType).toBe('LOGIN');
        expect(activities[1].activityType).toBe('UPDATE_PROFILE');
        expect(activities[2].activityType).toBe('LOGOUT');
        done();
      });

      stream.on('error', (err) => {
        done(err);
      });
    });

    // 3. Client Streaming
    test('should consume Client Streaming RPC (uploadAuditLogs)', (done) => {
      const call = grpcClient.uploadAuditLogs((err, response) => {
        expect(err).toBeNull();
        expect(response.processedCount).toBe(2);
        expect(response.status).toBe('SUCCESSFUL');
        done();
      });

      call.write({ userId: 'u1', action: 'CREATE_POST', timestamp: new Date().toISOString() });
      call.write({ userId: 'u1', action: 'DELETE_POST', timestamp: new Date().toISOString() });
      call.end();
    });

    // 4. Bidirectional Streaming
    test('should communicate over Bidirectional Streaming RPC (realtimeChat)', (done) => {
      const call = grpcClient.realtimeChat();
      const responses = [];

      call.on('data', (data) => {
        responses.push(data);
        if (responses.length === 2) {
          expect(responses[0].sender).toBe('Server Bot');
          expect(responses[0].message).toContain('Echoing: "Hello"');
          expect(responses[1].message).toContain('Echoing: "World"');
          call.end();
          done();
        }
      });

      call.write({ sender: 'client', message: 'Hello', timestamp: new Date().toISOString() });
      call.write({ sender: 'client', message: 'World', timestamp: new Date().toISOString() });
    });
  });

  describe('REST Gateway Compatibilities (gRPC-gateway equivalent)', () => {
    test('GET /api/v1/grpc-users/:id should proxy Unary request', async () => {
      const res = await request(app).get('/api/v1/grpc-users/user_rest_123');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.source).toBe('gRPC Unary Gateway Proxy');
      expect(res.body.data.id).toBe('user_rest_123');
    });

    test('GET /api/v1/grpc-users/:id/activities should proxy and buffer Server Streaming request', async () => {
      const res = await request(app).get('/api/v1/grpc-users/user_rest_123/activities');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.results).toBe(3);
      expect(res.body.data[0].activityType).toBe('LOGIN');
    });

    test('POST /api/v1/grpc-users/upload-logs should proxy Client Streaming request', async () => {
      const res = await request(app)
        .post('/api/v1/grpc-users/upload-logs')
        .send({
          logs: [
            { userId: 'rest_u', action: 'HTTP_GET' },
            { userId: 'rest_u', action: 'HTTP_POST' }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.processedCount).toBe(2);
    });
  });
});
