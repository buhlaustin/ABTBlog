// @ts-check
import { defineConfig, devices } from '@playwright/test';

/** Playwright smoke for Startup Simulator (served from public/ after copy-work). */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173'
  },
  webServer: {
    command: 'npm run copy-work && npx --yes serve public -l 4173',
    url: 'http://127.0.0.1:4173/play/startup-sim/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
