import { test, expect } from '@playwright/test';
import { flows } from '../flows.config';

test('logged-out visitors cannot open the protected page', async ({ page }) => {
  await page.goto(flows.paths.protected);

  // Either a redirect to login or a login form in place: both are fine.
  await expect(page.getByText(flows.loggedInMarker)).toHaveCount(0);
  await expect(page.getByLabel(flows.labels.password)).toBeVisible();
});
