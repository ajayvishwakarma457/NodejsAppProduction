const serviceRegistry = require('../../src/utils/serviceRegistry');
const Redis = require('ioredis');

// Mock Redis client locally for the service discovery tests
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    let store = {};
    return {
      zadd: jest.fn(async (key, score, member) => {
        if (!store[key]) store[key] = [];
        // Remove existing member if any
        store[key] = store[key].filter(x => x.member !== member);
        store[key].push({ score, member });
        return 1;
      }),
      zrem: jest.fn(async (key, member) => {
        if (store[key]) {
          store[key] = store[key].filter(x => x.member !== member);
        }
        return 1;
      }),
      zremrangebyscore: jest.fn(async (key, min, max) => {
        if (store[key]) {
          store[key] = store[key].filter(x => x.score < min || x.score > max);
        }
        return 0;
      }),
      zrangebyscore: jest.fn(async (key, min, max) => {
        if (!store[key]) return [];
        return store[key]
          .filter(x => x.score >= min)
          .map(x => x.member);
      }),
    };
  });
});

describe('Service Discovery & Load Balancing Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should successfully register and retrieve service instances', async () => {
    const serviceName = 'test-service';
    const hostA = 'http://127.0.0.1:9001';
    const hostB = 'http://127.0.0.1:9002';

    await serviceRegistry.registerInstance(serviceName, hostA, 10);
    await serviceRegistry.registerInstance(serviceName, hostB, 10);

    const instances = await serviceRegistry.getInstances(serviceName);
    expect(instances).toContain(hostA);
    expect(instances).toContain(hostB);
    expect(instances.length).toBe(2);
  });

  test('should gracefully deregister service instances', async () => {
    const serviceName = 'test-service';
    const hostA = 'http://127.0.0.1:9001';

    await serviceRegistry.registerInstance(serviceName, hostA, 10);
    let instances = await serviceRegistry.getInstances(serviceName);
    expect(instances).toContain(hostA);

    await serviceRegistry.deregisterInstance(serviceName, hostA);
    instances = await serviceRegistry.getInstances(serviceName);
    expect(instances).not.toContain(hostA);
  });
});
