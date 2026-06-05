# E2E Testing with Playwright

This document details the configuration and implementation of End-to-End (E2E) testing using **Playwright** in our production Node.js application.

---

## 1. Playwright vs Cypress (Industry Standard)

For modern Node.js web applications, **Playwright** is the industry standard for E2E testing over Cypress due to several key factors:

* **Performance & Speed**: Playwright executes test drivers out-of-process via Chrome DevTools Protocol (CDP), making it much faster than Cypress, which runs inside the browser sandbox.
* **Multi-Tab / Multi-Origin Support**: Playwright natively supports testing flows involving multiple browser contexts, tabs, and origins (e.g. redirecting to third-party OAuth logins like Google, then returning).
* **Parallelization**: Playwright runs tests in parallel using isolated worker processes out-of-the-box.
* **Automatic WebServer Management**: Playwright can automatically spin up your server backend before starting the tests and tear it down cleanly when done.

---

## 2. Configuration (`playwright.config.js`)

We established a custom configuration file at the project root to govern E2E executions:

```javascript
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5001', // Custom port for testing environments
    trace: 'on-first-retry',
    headless: true,                  // Run tests headlessly
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Start server automatically before E2E tests and tear down afterwards
  webServer: {
    command: 'NODE_ENV=test PORT=5001 node src/server.js',
    url: 'http://localhost:5001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

---

## 3. E2E Test Cases

We wrote E2E test scripts inside `tests/e2e/home.spec.js` to assert visual correctness, routing, and proper asset delivery:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Homepage E2E Tests', () => {
  test('should load the index page successfully', async ({ page }) => {
    // Navigate to page
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Express.js MVC Demo/i);

    // Verify main header exists and has correct text
    const header = page.locator('h1');
    await expect(header).toBeVisible();
    await expect(header).toHaveText('Welcome to Express.js MVC Demo');

    // Verify presence of info card and code tags
    const firstCodeTag = page.locator('code').nth(0);
    const secondCodeTag = page.locator('code').nth(1);
    await expect(firstCodeTag).toHaveText('public');
    await expect(secondCodeTag).toHaveText('express.static');
  });
});
```

---

## 4. Execution Commands

We added scripts in `package.json` for simple E2E execution workflows:

### Run E2E Tests Headlessly
Runs E2E test files matching the configuration patterns:
```bash
npm run test:e2e
```

### Run E2E Tests in UI Mode
Launches Playwright's interactive visual UI runner to step through tests, inspect selectors, and trace execution:
```bash
npx playwright test --ui
```
