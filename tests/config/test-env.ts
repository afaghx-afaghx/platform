export function testEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: 'test',
    AFAGHX_TEST_MODE: 'true',
    DATABASE_URL: 'postgresql://test:test@127.0.0.1:5432/afaghx_test',
    REDIS_URL: 'redis://127.0.0.1:6379/15',
    ...overrides
  } as const;
}

export function applyTestEnv(overrides: Record<string, string | undefined> = {}) {
  for (const [key, value] of Object.entries(testEnv(overrides))) {
    if (value !== undefined) process.env[key] = value;
  }
}
