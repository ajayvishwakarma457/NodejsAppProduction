# Test Coverage Reporting with Jest

This document describes the design, configuration, and execution workflow for **Test Coverage Reporting** in our production Node.js application using Jest.

---

## 1. Coverage Configuration

Jest collects coverage metrics natively by parsing the files specified under the `collectCoverageFrom` property in `jest.config.js`.

We configured `jest.config.js` to target all source files, excluding the initial application bootstrap scripts (`server.js`, `app.js`) and database configurations:

```javascript
module.exports = {
  // Use Node environment for testing backend services
  testEnvironment: 'node',

  // Run files after testing framework is installed
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of glob patterns for which coverage should be collected
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/app.js',
    '!src/config/*.js',
  ],

  // Enforce coverage thresholds for production build validation
  coverageThreshold: {
    global: {
      statements: 30,
      branches: 20,
      functions: 15,
      lines: 30,
    },
  },
};
```

---

## 2. Understanding Coverage Metrics

When you generate a test coverage report, Jest evaluates code coverage across four distinct dimensions:

* **Statements (`% Stmts`)**: The percentage of single expressions or commands executed during testing.
* **Branches (`% Branch`)**: The percentage of conditional paths (e.g. `if`, `else`, `switch` statements) evaluated by the tests.
* **Functions (`% Funcs`)**: The percentage of defined functions, methods, or callbacks called by the tests.
* **Lines (`% Lines`)**: The percentage of physical lines of code executed.

---

## 3. Enforcing Minimum Thresholds

By setting `coverageThreshold` in the Jest configuration, we enforce a strict quality gate:
* If coverage in any of the specified categories (`statements`, `branches`, `functions`, `lines`) falls below the specified percentage, Jest will exit with a non-zero exit code (`1`), automatically breaking the build pipeline in a CI/CD system.

---

## 4. Commands for Coverage Reporting

We added commands under the `scripts` object in `package.json` to make running and checking coverage simple:

### Generate Coverage Report
Generates a terminal-based text summary and builds detailed HTML/lcov reports under the `/coverage` directory:
```bash
npm run test:coverage
```

### Viewing Detailed Reports
Jest compiles a static HTML website representing your coverage under `coverage/lcov-report/index.html`. You can open this file in any web browser to:
1. Drill down into individual folders and files.
2. View highlighted source lines showing exactly which lines, branches, or functions are uncovered by the test suites (visualized in red highlight).
