import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4323';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command:
          process.env.PLAYWRIGHT_DEV_COMMAND ??
          'npm run build && CI=true npx wrangler dev --ip 127.0.0.1 --port 4323 --var DEV_ADMIN_TOKEN:ak-local-e2e-only-token',
        url: `${baseURL}/api/health`,
        reuseExistingServer: false,
        timeout: 90000,
      },
});
