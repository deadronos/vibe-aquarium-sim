import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 150_000,
  expect: { timeout: 10_000 },
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5175/vibe-aquarium-sim/',
    ...devices['Desktop Chrome'],
    headless: true,
    channel: 'chromium',
    launchOptions: {
      // CI runs headed under Xvfb with Mesa's software Vulkan; route ANGLE through SwiftShader
      // Vulkan, the stack this repo's smoke tests have been proven on.
      args:
        process.platform === 'linux'
          ? [
              '--enable-features=Vulkan',
              '--use-angle=vulkan',
              '--use-vulkan=swiftshader',
              '--disable-vulkan-surface',
            ]
          : [],
    },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-dist-with-base.js',
    url: 'http://127.0.0.1:5175/vibe-aquarium-sim/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
