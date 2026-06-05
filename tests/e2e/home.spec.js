const { test, expect } = require('@playwright/test');

test.describe('Homepage E2E Tests', () => {
  test('should load the index page successfully', async ({ page }) => {
    // Navigate to base URL
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
