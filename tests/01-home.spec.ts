import { test, expect } from '@playwright/test';
import { flows } from '../flows.config';

test('home page loads without errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('response', (res) => {
    // Browsers ask for a favicon on their own; a missing one is not a bug users see.
    if (res.status() >= 400 && !res.url().endsWith('/favicon.ico')) {
      failedRequests.push(`${res.status()} ${res.url()}`);
    }
  });

  const response = await page.goto(flows.paths.home);
  expect(response?.status(), 'home page status').toBeLessThan(400);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('body')).not.toBeEmpty();
  expect(consoleErrors, 'JavaScript errors in the console').toEqual([]);
  expect(failedRequests, 'requests that failed').toEqual([]);
});
