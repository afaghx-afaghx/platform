import { randomUUID } from 'node:crypto';
import { generateRefreshToken, hashRefreshToken } from './tokens';
import type { Session } from './contracts';

export interface RefreshTokenRecord {
  sessionId: string;
  familyId: string;
  tokenHash: string;
  usedAt: string | null;
  revokedAt: string | null;
  expiresAt: string;
}
export interface RefreshTokenStore {
  findForUpdate(tokenHash: string): Promise<RefreshTokenRecord | null>;
  rotate(input: { current: RefreshTokenRecord; nextHash: string; now: string }): Promise<void>;
  revokeFamily(familyId: string, reason: string, now: string): Promise<void>;
}
export interface TransactionalSessionStore {
  getForUpdate(id: string): Promise<Session | null>;
  revoke(id: string, reason: string): Promise<void>;
}
export interface TransactionContext { refreshTokens: RefreshTokenStore; sessions: TransactionalSessionStore; }
export interface TransactionRunner { transaction<T>(work: (context: TransactionContext) => Promise<T>): Promise<T>; }

/** Refresh-token rotation is one transaction: lock, validate, consume and issue successor. */
export async function rotateRefreshToken(presentedToken: string, tx: TransactionRunner, now = new Date().toISOString()): Promise<{ refreshToken: string; session: Session }> {
  if (!presentedToken) throw new Error('INVALID_REFRESH_TOKEN');
  return tx.transaction(async ({ refreshTokens, sessions }) => {
    const current = await refreshTokens.findForUpdate(hashRefreshToken(presentedToken));
    if (!current || current.expiresAt <= now) throw new Error('INVALID_REFRESH_TOKEN');
    if (current.usedAt || current.revokedAt) {
      await refreshTokens.revokeFamily(current.familyId, 'REFRESH_TOKEN_REUSE', now);
      await sessions.revoke(current.sessionId, 'REFRESH_TOKEN_REUSE');
      throw new Error('REFRESH_TOKEN_REUSE_DETECTED');
    }
    const session = await sessions.getForUpdate(current.sessionId);
    if (!session || session.status !== 'active' || session.refreshTokenFamilyId !== current.familyId) throw new Error('SESSION_NOT_ACTIVE');
    const refreshToken = generateRefreshToken();
    await refreshTokens.rotate({ current, nextHash: hashRefreshToken(refreshToken), now });
    return { refreshToken, session: { ...session, lastRotatedAt: now } };
  });
}

export function newSession(input: Omit<Session, 'id' | 'refreshTokenFamilyId'>): Session {
  return { ...input, id: randomUUID(), refreshTokenFamilyId: randomUUID() };
}
