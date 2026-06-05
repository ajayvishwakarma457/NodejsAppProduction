const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../../src/app');
const User = require('../../src/models/userModel');
const { SNAPSHOT_DIR } = require('../../src/utils/heapdump');

// Mock User model
jest.mock('../../src/models/userModel');

describe('Memory Leak Detection Integration Tests', () => {
  const createdFiles = [];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Clean up created heapsnapshot files to prevent disk pollution
    createdFiles.forEach((filepath) => {
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      } catch (err) {
        // Suppress errors during cleanup
      }
    });
  });

  test('should generate V8 heap snapshot successfully on POST /api/v1/jobs/heapdump', async () => {
    User.findById.mockResolvedValue({
      _id: 'user123',
      name: 'Admin User',
      role: 'admin',
    });

    const res = await request(app)
      .post('/api/v1/jobs/heapdump')
      .set('Authorization', 'Bearer validtoken')
      .set('x-user-id', 'user123')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toContain('heap snapshot generated successfully');
    expect(res.body.data.filename).toMatch(/^snapshot-\d+\.heapsnapshot$/);

    const filepath = res.body.data.filepath;
    expect(fs.existsSync(filepath)).toBe(true);

    // Track for cleanup
    createdFiles.push(filepath);
  }, 15000);
});
