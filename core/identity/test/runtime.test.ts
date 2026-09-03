import { describe, expect, it } from 'vitest';
import { rotateRefreshToken } from '../src/runtime';

const session = {
  id: 'session-1', identityId: 'identity-1', tenantId: 'tenant-1', refreshTokenFamilyId: 'family-1',
  status: 'active' as const, createdAt: '2026-01-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z',
};

function context(overrides: { token?: Record<string, unknown>; session?: typeof session } = {}) {
  const calls: string[] = [];
  const refreshTokens = {
    findForUpdate: async () => overrides.token ?? ({ sessionId: 'session-1', familyId: 'family-1', tokenHash: 'x', usedAt: null, revokedAt: null, expiresAt: '2027-01-01T00:00:00.000Z' }),
    rotate: async () => { calls.push('rotate'); },
    revokeFamily: async () => { calls.push('revoke-family'); },
  };
  const sessions = {
    getForUpdate: async () => overrides.session ?? session,
    revoke: async () => { calls.push('revoke-session'); },
  };
  return { refreshTokens, sessions, calls };
}

describe('refresh-token runtime boundary', () => {
  it('rotates a valid token atomically using transaction-scoped stores', async () => {
    const ctx = context();
    let transactions = 0;
    const result = await rotateRefreshToken('presented-token', {
      transaction: async (work) => { transactions += 1; return work(ctx); },
    });
    expect(transactions).toBe(1);
    expect(result.refreshToken).toBeTruthy();
    expect(ctx.calls).toEqual(['rotate']);
  });

  it('revokes the entire family when reuse is detected', async () => {
    const ctx = context({
      token: { sessionId: 'session-1', familyId: 'family-1', tokenHash: 'x', usedAt: '2026-09-01T00:00:00.000Z', revokedAt: null, expiresAt: '2027-01-01T00:00:00.000Z' },
    });
    await expect(rotateRefreshToken('replayed-token', { transaction: async (work) => work(ctx) }))
      .rejects.toThrow('REFRESH_TOKEN_REUSE_DETECTED');
    expect(ctx.calls).toEqual(['revoke-family', 'revoke-session']);
  });

  it('treats a revoked token as replay and revokes its family', async () => {
    const ctx = context({
      token: { sessionId: 'session-1', familyId: 'family-1', tokenHash: 'x', usedAt: null, revokedAt: '2026-09-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z' },
    });
    await expect(rotateRefreshToken('revoked-token', { transaction: async (work) => work(ctx) }))
      .rejects.toThrow('REFRESH_TOKEN_REUSE_DETECTED');
    expect(ctx.calls).toEqual(['revoke-family', 'revoke-session']);
  });
});
