import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@tests': resolve(__dirname, '..')
    }
  },
  test: {
    environment: 'node',
    globals: false,
    setupFiles: [resolve(__dirname, '../tooling/setup.ts')],
    include: [resolve(__dirname, '../**/*.test.ts')],
    exclude: [resolve(__dirname, '../node_modules/**'), resolve(__dirname, '../coverage/**')],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: resolve(__dirname, '../evidence/coverage'),
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 }
    }
  }
});
