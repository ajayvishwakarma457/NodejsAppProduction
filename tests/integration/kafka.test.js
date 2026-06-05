const kafka = require('../../src/config/kafka');
const kafkaProducer = require('../../src/messaging/kafkaProducer');
const kafkaConsumer = require('../../src/messaging/kafkaConsumer');

// Mock kafkajs client library
jest.mock('kafkajs', () => {
  const mockProducer = {
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    send: jest.fn().mockResolvedValue([{ partition: 2, baseOffset: '100' }]),
  };

  const mockConsumer = {
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    subscribe: jest.fn().mockResolvedValue(true),
    run: jest.fn().mockImplementation(async ({ eachMessage }) => {
      // Simulate reading a message from partition
      await eachMessage({
        topic: 'user-activities',
        partition: 2,
        message: {
          key: Buffer.from('user_123'),
          value: Buffer.from(JSON.stringify({ userId: '123', activity: 'USER_REGISTERED' })),
          offset: '100',
        },
      });
    }),
  };

  return {
    Kafka: jest.fn().mockImplementation(() => ({
      producer: jest.fn().mockReturnValue(mockProducer),
      consumer: jest.fn().mockReturnValue(mockConsumer),
    })),
    logLevel: {
      ERROR: 'ERROR',
      WARN: 'WARN',
      INFO: 'INFO',
    },
  };
});

describe('Kafka Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await kafkaProducer.disconnect();
    await kafkaConsumer.stopAll();
  });

  test('should connect and publish partitioned message to Kafka topic', async () => {
    const payload = { userId: '123', activity: 'USER_REGISTERED' };

    const result = await kafkaProducer.publish('user-activities', 'user_123', payload);

    expect(result[0].partition).toBe(2);
    expect(result[0].baseOffset).toBe('100');
  });

  test('should subscribe and consume messages from topic partition and read offsets', async () => {
    const mockHandler = jest.fn();

    await kafkaConsumer.startConsumer('notification-group', 'user-activities', mockHandler);

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '123', activity: 'USER_REGISTERED' }),
      'user_123',
      2,
      '100'
    );
  });
});
