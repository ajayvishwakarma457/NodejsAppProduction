const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/userModel');
const { addEmailJob } = require('../../src/queues/emailQueue');

// Mock User Model and BullMQ Queue
jest.mock('../../src/models/userModel');
jest.mock('../../src/queues/emailQueue');

describe('User Onboarding Saga Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should successfully complete Saga distributed transaction when all steps succeed', async () => {
    // 1. Mock database user creation in PENDING state
    const mockUserInstance = {
      _id: 'mock_saga_user_999',
      name: 'Saga User Success',
      email: 'sagasuccess@example.com',
      status: 'pending',
      save: jest.fn().mockResolvedValue(true),
    };

    User.create.mockResolvedValue(mockUserInstance);
    addEmailJob.mockResolvedValue({ id: 'job_email_123' });

    const response = await request(app)
      .post('/api/v1/users/saga-register')
      .send({
        name: 'Saga User Success',
        email: 'sagasuccess@example.com',
        password: 'securepassword123',
      });

    // Verify Saga committed user to active state
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Saga User Success',
      email: 'sagasuccess@example.com',
      status: 'pending',
    }));
    expect(addEmailJob).toHaveBeenCalled();
    expect(mockUserInstance.status).toBe('active');
    expect(mockUserInstance.save).toHaveBeenCalled();
  });

  test('should execute compensating transaction (rollback) when downstream email queue fails', async () => {
    const mockUserInstance = {
      _id: 'mock_saga_user_999',
      name: 'Saga User Failure',
      email: 'trigger-saga-failure@example.com',
      status: 'pending',
      save: jest.fn(),
    };

    User.create.mockResolvedValue(mockUserInstance);

    const response = await request(app)
      .post('/api/v1/users/saga-register')
      .send({
        name: 'Saga User Failure',
        email: 'trigger-saga-failure@example.com', // triggers simulated queue failure in sagaOrchestrator
        password: 'securepassword123',
      });

    // Verify Saga failed and rolled back user creation via compensating transaction
    expect(response.status).toBe(400);
    expect(response.body.status).toBe('fail');
    expect(response.body.message).toContain('Onboarding Saga failed');
    expect(User.findByIdAndDelete).toHaveBeenCalledWith('mock_saga_user_999');
    expect(mockUserInstance.save).not.toHaveBeenCalled();
  });
});
