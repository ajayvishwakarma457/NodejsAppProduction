const natsConfig = require('../../src/config/nats');
const natsPublisher = require('../../src/messaging/natsPublisher');
const natsSubscriber = require('../../src/messaging/natsSubscriber');

// Mock NATS client library
jest.mock('nats', () => {
  const mockSub = {
    unsubscribe: jest.fn(),
    // Implement async iterator to yield a simulated message when subscribed
    [Symbol.asyncIterator]: jest.fn().mockImplementation(async function* () {
      yield {
        subject: 'user.notifications',
        data: Buffer.from(JSON.stringify({
          userId: 'user_123',
          email: 'test@example.com',
          type: 'WELCOME_NOTIFICATION'
        }))
      };
    })
  };

  const mockConnection = {
    publish: jest.fn(),
    subscribe: jest.fn().mockReturnValue(mockSub),
    close: jest.fn().mockResolvedValue(true),
    // Status stream iterator
    status: jest.fn().mockImplementation(async function* () {
      yield { type: 'reconnecting', data: {} };
    })
  };

  return {
    connect: jest.fn().mockResolvedValue(mockConnection),
    JSONCodec: jest.fn().mockImplementation(() => ({
      encode: jest.fn().mockImplementation((val) => Buffer.from(JSON.stringify(val))),
      decode: jest.fn().mockImplementation((buf) => JSON.parse(buf.toString()))
    }))
  };
});

describe('NATS Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await natsSubscriber.unsubscribeAll();
    await natsConfig.close();
  });

  test('should establish connection and publish message to NATS subject', async () => {
    const payload = { test: 'data' };
    await natsPublisher.publish('user.notifications', payload);

    const nc = await natsConfig.getConnection();
    expect(nc.publish).toHaveBeenCalledWith(
      'user.notifications',
      expect.any(Buffer)
    );
  });

  test('should subscribe to subject and process received message payload', async () => {
    const mockHandler = jest.fn();

    await natsSubscriber.subscribe('user.notifications', mockHandler);

    // Yield message yields synchronously or during microtasks. Let's wait a small tick.
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_123',
        email: 'test@example.com',
        type: 'WELCOME_NOTIFICATION'
      }),
      'user.notifications'
    );
  });
});
