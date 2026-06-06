// eslint.config.js
module.exports = [
  {
    ignores: [
      'tests/load/**',
      'node_modules/**',
      'coverage/**',
      'scratch/**'
    ]
  },
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        // Node.js globals
        process: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Jest globals
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        beforeAll: 'readonly',
        afterEach: 'readonly',
        afterAll: 'readonly',
        // Fetch/Edge standard globals
        URL: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
      }
    },
    rules: {
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      'no-console': 'off',
      'eqeqeq': ['warn', 'always'],
      'curly': 'off',
      'semi': ['warn', 'always'],
      'quotes': 'off'
    }
  }
];
