const mockRedis = jest.fn().mockImplementation(() => {
  return {
    status: 'ready',
    on: jest.fn(),
    call: jest.fn().mockImplementation((command, ...args) => {
      const cmd = String(command).toLowerCase();
      const arg0 = args[0] ? String(args[0]).toLowerCase() : '';
      
      console.log(`[Mock Redis Call] Command: ${command}, Args:`, args);
      if (cmd === 'script' && arg0 === 'load') {
        console.log('[Mock Redis Call] Returning script load SHA hash');
        return Promise.resolve('mock_sha_hash_value_12345');
      }
      // Return [currentHits, timeToResetMs] for rate limit script evaluation
      console.log('[Mock Redis Call] Returning evaluation array [1, 60000]');
      return Promise.resolve([1, 60000]);
    }),
    defineCommand: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };
});

module.exports = mockRedis;
