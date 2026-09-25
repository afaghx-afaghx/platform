import { afterEach, beforeAll } from 'vitest';
import { applyTestEnv } from '../config/test-env';

beforeAll(() => applyTestEnv());
afterEach(() => {
  // Individual tests own their state; this hook intentionally does not reset application globals.
});
