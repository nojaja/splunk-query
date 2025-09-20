import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 300000, // 5分
  expect: {
    timeout: 30000 // 30秒
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'e2e',
      testMatch: 'splunk-e2e.spec.js',
    },
  ],
});