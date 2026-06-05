const cluster = require('cluster');
const os = require('os');

// Mock cluster module
jest.mock('cluster', () => {
  const listeners = {};
  return {
    isPrimary: true,
    isMaster: true,
    fork: jest.fn(),
    on: jest.fn().mockImplementation((event, callback) => {
      listeners[event] = callback;
    }),
    // Helper to simulate event emissions in tests
    emitExit: (worker, code, signal) => {
      if (listeners['exit']) {
        listeners['exit'](worker, code, signal);
      }
    }
  };
});

// Mock os module to return a controlled number of CPUs while preserving other functions like platform()
jest.mock('os', () => {
  const actualOs = jest.requireActual('os');
  return {
    ...actualOs,
    cpus: () => [{}, {}, {}, {}], // 4 CPU cores
  };
});

// Mock DB connection and app setups to prevent side effects during server execution
jest.mock('../../src/config/db', () => jest.fn().mockResolvedValue(true));
jest.mock('../../src/app', () => ({
  listen: jest.fn().mockReturnValue({
    close: jest.fn(),
  }),
}));
jest.mock('../../src/utils/pubSubInvalidator', () => ({
  initListener: jest.fn(),
}));
jest.mock('../../src/utils/cronScheduler', () => ({
  init: jest.fn(),
  stop: jest.fn(),
}));

describe('Node.js Cluster Module Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLUSTER_MODE = 'true';
  });

  afterEach(() => {
    delete process.env.CLUSTER_MODE;
    // Clear cache of server.js to allow re-importing / testing side effects
    delete require.cache[require.resolve('../../src/server')];
  });

  test('should fork workers matching CPU core count when CLUSTER_MODE is true and process is Primary', () => {
    cluster.isPrimary = true;
    cluster.isMaster = true;

    // Loading the server script executes the primary cluster block
    require('../../src/server');

    expect(cluster.fork).toHaveBeenCalledTimes(4); // 4 CPUs
    expect(cluster.on).toHaveBeenCalledWith('exit', expect.any(Function));
  });

  test('should restart (re-fork) worker when a worker exit event occurs', () => {
    cluster.isPrimary = true;
    cluster.isMaster = true;

    require('../../src/server');

    // Reset fork call count to focus on the exit handler logic
    cluster.fork.mockClear();

    // Simulate worker crash exit
    const mockWorker = { process: { pid: 9999 } };
    cluster.emitExit(mockWorker, 1, 'SIGTERM');

    expect(cluster.fork).toHaveBeenCalledTimes(1);
  });
});
