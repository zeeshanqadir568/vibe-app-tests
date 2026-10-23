import { test, expect } from '@playwright/test';
import { flows } from '../flows.config';
import { logIn } from './helpers';

test('core feature: a new item is saved and still there after reload', async ({ page }) => {
  await logIn(page);
  await page.goto(flows.coreFeature.path);

  const text = `vibe-test item ${Date.now()}`;
  await page.getByLabel(flows.coreFeature.input).fill(text);
  await page.getByRole('button', { name: flows.coreFeature.submit }).click();
  await expect(page.getByText(text)).toBeVisible();

  await page.reload();
  await expect(page.getByText(text)).toBeVisible();
});
