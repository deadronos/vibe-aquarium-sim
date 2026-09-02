import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5175/vibe-aquarium-sim/',
    ...devices['Desktop Chrome'],
    headless: true,
  },
  webServer: {
    command: 'node scripts/serve-dist-with-base.js',
    url: 'http://127.0.0.1:5175/vibe-aquarium-sim/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
