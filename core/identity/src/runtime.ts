import { randomUUID } from 'node:crypto';
import { generateRefreshToken, hashRefreshToken } from './tokens';
import type { Session, SessionStore } from './contracts';

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

export interface TransactionRunner {
  transaction<T>(work: () => Promise<T>): Promise<T>;
}

/**
 * Refresh-token rotation must be executed inside one database transaction.
 * Reuse of an already-used/revoked token compromises the entire token family.
 */
export async function rotateRefreshToken(
  presentedToken: string,
  tokens: RefreshTokenStore,
  sessions: SessionStore,
  tx: TransactionRunner,
  now = new Date().toISOString(),
): Promise<{ refreshToken: string; session: Session }> {
  if (!presentedToken) throw new Error('INVALID_REFRESH_TOKEN');

  return tx.transaction(async () => {
    const current = await tokens.findForUpdate(hashRefreshToken(presentedToken));
    if (!current || current.revokedAt || current.expiresAt <= now) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    if (current.usedAt) {
      await tokens.revokeFamily(current.familyId, 'REFRESH_TOKEN_REUSE', now);
      await sessions.revoke(current.sessionId, 'REFRESH_TOKEN_REUSE');
      throw new Error('REFRESH_TOKEN_REUSE_DETECTED');
    }

    const session = await sessions.get(current.sessionId);
    if (!session || session.status !== 'active' || session.refreshTokenFamilyId !== current.familyId) {
      throw new Error('SESSION_NOT_ACTIVE');
    }

    const refreshToken = generateRefreshToken();
    await tokens.rotate({ current, nextHash: hashRefreshToken(refreshToken), now });
    return { refreshToken, session };
  });
}

export function newSession(input: Omit<Session, 'id' | 'refreshTokenFamilyId'>): Session {
  return { ...input, id: randomUUID(), refreshTokenFamilyId: randomUUID() };
}
