import { describe, expect, it } from 'vitest';
import { rotateRefreshToken } from '../src/runtime';

const session = {
  id: 'session-1', identityId: 'identity-1', tenantId: 'tenant-1', refreshTokenFamilyId: 'family-1',
  status: 'active' as const, createdAt: '2026-01-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z',
};

function stores(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const tokens = {
    findForUpdate: async () => ({ sessionId: 'session-1', familyId: 'family-1', tokenHash: 'x', usedAt: null, revokedAt: null, expiresAt: '2027-01-01T00:00:00.000Z' }),
    rotate: async () => { calls.push('rotate'); },
    revokeFamily: async () => { calls.push('revoke-family'); },
    ...overrides,
  };
  const sessions = {
    get: async () => session,
    revoke: async () => { calls.push('revoke-session'); },
  };
  return { tokens, sessions, calls };
}

describe('refresh-token runtime boundary', () => {
  it('rotates a valid token atomically', async () => {
    const { tokens, sessions, calls } = stores();
    let transactions = 0;
    const result = await rotateRefreshToken('presented-token', tokens, sessions, {
      transaction: async (work) => { transactions += 1; return work(); },
    });
    expect(transactions).toBe(1);
    expect(result.refreshToken).toBeTruthy();
    expect(calls).toEqual(['rotate']);
  });

  it('revokes the entire family when reuse is detected', async () => {
    const { tokens, sessions, calls } = stores({
      findForUpdate: async () => ({ sessionId: 'session-1', familyId: 'family-1', tokenHash: 'x', usedAt: '2026-09-01T00:00:00.000Z', revokedAt: null, expiresAt: '2027-01-01T00:00:00.000Z' }),
    });
    await expect(rotateRefreshToken('replayed-token', tokens, sessions, { transaction: async (work) => work() }))
      .rejects.toThrow('REFRESH_TOKEN_REUSE_DETECTED');
    expect(calls).toEqual(['revoke-family', 'revoke-session']);
  });
});
