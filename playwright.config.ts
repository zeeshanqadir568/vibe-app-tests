import { defineConfig, devices } from '@playwright/test';

// Local .env is optional; CI passes the same values as secrets.
try {
  process.loadEnvFile();
} catch {
  // no .env file
}

const DEMO_PORT = 4173;
const targetUrl = process.env.BASE_URL || '';
const useDemo = !targetUrl;

if (useDemo) {
  // Seed account of the demo app (test values, also in .env.example).
  process.env.TEST_EMAIL ||= 'test@example.com';
  process.env.TEST_PASSWORD ||= 'test-password-123';
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: targetUrl || `http://localhost:${DEMO_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],
  webServer: useDemo
    ? {
        command: 'node demo-app/server.js',
        url: `http://localhost:${DEMO_PORT}`,
        env: { PORT: String(DEMO_PORT), DEMO_BUG: process.env.DEMO_BUG || '' },
        reuseExistingServer: false,
      }
    : undefined,
});
