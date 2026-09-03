import { describe, expect, it } from 'vitest';
import { createPostgresClient } from './index';

describe('PostgreSQL persistence boundary', () => {
  it('requires an explicit database URL', () => {
    expect(() => createPostgresClient({ url: '' })).toThrow('DATABASE_URL_REQUIRED');
  });
});
