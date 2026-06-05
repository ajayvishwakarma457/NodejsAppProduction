const rabbitmq = require('../../src/config/rabbitmq');
const rabbitmqProducer = require('../../src/messaging/rabbitmqProducer');
const rabbitmqConsumer = require('../../src/messaging/rabbitmqConsumer');

// Mock amqplib client library
jest.mock('amqplib', () => {
  const mockChannel = {
    assertExchange: jest.fn().mockResolvedValue(true),
    assertQueue: jest.fn().mockResolvedValue({ queue: 'test_queue' }),
    bindQueue: jest.fn().mockResolvedValue(true),
    publish: jest.fn().mockReturnValue(true),
    consume: jest.fn().mockImplementation((queue, callback) => {
      // Simulate calling consumer on message
      const mockMsg = {
        fields: { routingKey: 'user.register' },
        content: Buffer.from(JSON.stringify({ userId: '123', action: 'USER_REGISTERED' })),
      };
      callback(mockMsg);
      return Promise.resolve({ consumerTag: 'test-tag' });
    }),
    ack: jest.fn(),
    nack: jest.fn(),
    close: jest.fn().mockResolvedValue(true),
  };

  const mockConnection = {
    createChannel: jest.fn().mockResolvedValue(mockChannel),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(true),
  };

  return {
    connect: jest.fn().mockResolvedValue(mockConnection),
  };
});

describe('RabbitMQ Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await rabbitmq.close();
  });

  test('should successfully establish connection and publish message', async () => {
    const message = { userId: 'user123', action: 'USER_REGISTERED' };
    
    // Publish message
    await rabbitmqProducer.publish('security_exchange', 'direct', 'user.register', message);

    const channel = await rabbitmq.getChannel();
    expect(channel.assertExchange).toHaveBeenCalledWith('security_exchange', 'direct', { durable: true });
    expect(channel.publish).toHaveBeenCalledWith(
      'security_exchange',
      'user.register',
      expect.any(Buffer),
      { persistent: true }
    );
  });

  test('should successfully bind queue and consume message with explicit ACK', async () => {
    const mockHandler = jest.fn();

    // Consume message
    await rabbitmqConsumer.consume(
      'security_exchange',
      'direct',
      'audit_log_queue',
      'user.register',
      mockHandler
    );

    const channel = await rabbitmq.getChannel();
    expect(channel.assertQueue).toHaveBeenCalledWith('audit_log_queue', { durable: true });
    expect(channel.bindQueue).toHaveBeenCalledWith('audit_log_queue', 'security_exchange', 'user.register');
    expect(channel.consume).toHaveBeenCalled();
    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '123', action: 'USER_REGISTERED' }),
      'user.register'
    );
    expect(channel.ack).toHaveBeenCalled();
  });
});
