import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command:
      'npm run build && CI=true npx wrangler dev --ip 127.0.0.1 --port 4321 --var DEV_ADMIN_TOKEN:ak-local-e2e-only-token',
    url: 'http://127.0.0.1:4321/api/health',
    reuseExistingServer: false,
    timeout: 90000,
  },
});
