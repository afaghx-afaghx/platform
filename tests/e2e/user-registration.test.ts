import { describe, expect, it } from 'vitest';
import { AfxCore } from '../../core/AFX-CORE/src/core.js';
describe('user registration flow', () => {
  it('creates an identity through AFX-CORE and rejects duplicates', () => {
    const core = new AfxCore();
    const first = core.createUser({ email: 'registration@example.test', password: 'Correct Horse Battery Staple!' });
    expect(first.status).toBe('active');
    expect(() => core.createUser({ email: 'REGISTRATION@example.test', password: 'Correct Horse Battery Staple!' })).toThrow('user_exists');
  });
});
