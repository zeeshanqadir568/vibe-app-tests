import { expect, type Page } from '@playwright/test';
import { flows } from '../flows.config';

export function testAccount() {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('Set TEST_EMAIL and TEST_PASSWORD (a test account, never a real user).');
  }
  return { email, password };
}

export function uniqueEmail() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const domain = process.env.SIGNUP_EMAIL_DOMAIN || 'example.com';
  return `vibe-test+${stamp}@${domain}`;
}

export async function fillCredentials(page: Page, email: string, password: string) {
  await page.getByLabel(flows.labels.email).fill(email);
  await page.getByLabel(flows.labels.password).fill(password);
}

export async function logIn(page: Page) {
  const { email, password } = testAccount();
  await page.goto(flows.paths.login);
  await fillCredentials(page, email, password);
  await page.getByRole('button', { name: flows.buttons.login }).click();
  await expect(page.getByText(flows.loggedInMarker)).toBeVisible();
}
