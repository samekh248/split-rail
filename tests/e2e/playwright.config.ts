import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PREVIEW_BASE_URL ?? 'http://localhost:5173';
const shardTotal = process.env.SHARD_TOTAL ? Number(process.env.SHARD_TOTAL) : undefined;

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 120_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /lifecycle\/.*\.spec\.ts/,
    },
  ],
  ...(shardTotal
    ? {
        shard: {
          current: Number(process.env.SHARD_INDEX ?? 1),
          total: shardTotal,
        },
      }
    : {}),
});
