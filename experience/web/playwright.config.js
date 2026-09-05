import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  testMatch: '**/*.spec.js',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4173', ignoreHTTPSErrors: true },
  webServer: {
    command: 'PORT=4173 node server.js',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false,
    timeout: 30_000
  }
});
