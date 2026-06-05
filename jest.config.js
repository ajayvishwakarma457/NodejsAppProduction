module.exports = {
  // Use Node environment for testing backend services
  testEnvironment: 'node',

  // Run files after testing framework is installed
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Automatically restore mock state and sandboxes before every test
  restoreMocks: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/app.js',
    '!src/config/*.js',
  ],

  // The test match patterns for locating test files
  testMatch: [
    '**/tests/**/*.test.js',
  ],
};
