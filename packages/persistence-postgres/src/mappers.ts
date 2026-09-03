import type { Identity, Session } from '@afaghx/afx-core/src/contracts';

export interface IdentityRow { id: string; subject: string; status: Identity['status']; created_at: Date; }
export interface SessionRow { id: string; identity_id: string; tenant_id: string; refresh_family_id: string; status: Session['status']; created_at: Date; expires_at: Date; last_rotated_at: Date | null; }

export function mapIdentity(row: IdentityRow): Identity {
  return { id: row.id, subject: row.subject, status: row.status, createdAt: row.created_at.toISOString() };
}

export function mapSession(row: SessionRow): Session {
  return {
    id: row.id,
    identityId: row.identity_id,
    tenantId: row.tenant_id,
    refreshTokenFamilyId: row.refresh_family_id,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    ...(row.last_rotated_at ? { lastRotatedAt: row.last_rotated_at.toISOString() } : {}),
  };
}
