import { test, expect } from '@playwright/test';
import { flows } from '../flows.config';
import { fillCredentials, logIn, testAccount } from './helpers';

test('a user can log in and log out', async ({ page }) => {
  await logIn(page);

  await page.getByRole('button', { name: flows.buttons.logout }).click();
  await page.goto(flows.paths.protected);
  await expect(page.getByText(flows.loggedInMarker)).toHaveCount(0);
});

test('a wrong password does not log in', async ({ page }) => {
  await page.goto(flows.paths.login);
  await fillCredentials(page, testAccount().email, 'definitely-not-the-password');
  await page.getByRole('button', { name: flows.buttons.login }).click();

  await expect(page.getByText(flows.loggedInMarker)).toHaveCount(0);
  await expect(page.getByLabel(flows.labels.password)).toBeVisible();
});
