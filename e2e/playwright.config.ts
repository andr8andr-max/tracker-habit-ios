import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    channel: 'msedge',
    headless: true,
    locale: 'ru-RU',
    viewport: { width: 1280, height: 860 },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    cwd: '../client',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 90_000,
  },
});
