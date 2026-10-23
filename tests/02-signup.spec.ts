import { test, expect } from '@playwright/test';
import { flows } from '../flows.config';
import { fillCredentials, uniqueEmail } from './helpers';

test('a new user can sign up', async ({ page }, testInfo) => {
  // Each sign-up can send a confirmation email, and auth providers rate-limit those.
  // One sign-up per run is enough.
  test.skip(testInfo.project.name !== 'desktop', 'sign-up runs on desktop only');

  await page.goto(flows.paths.signup);
  await fillCredentials(page, uniqueEmail(), `Vt-${Date.now()}-pass!`);
  await page.getByRole('button', { name: flows.buttons.signup }).click();

  const marker = flows.afterSignup === 'loggedIn' ? flows.loggedInMarker : flows.confirmEmailMarker;
  await expect(page.getByText(marker)).toBeVisible();
});
