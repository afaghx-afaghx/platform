import postgres, { type Sql, type TransactionSql } from 'postgres';
import type { Identity, Session, UUID } from '@afaghx/afx-core/src/contracts';
import type { RefreshTokenRecord, RefreshTokenStore, TransactionContext, TransactionRunner, TransactionalSessionStore } from '@afaghx/afx-core/src/runtime';
import type { IdentityStore, MembershipStore, SessionRepository, RefreshTokenRepository } from '@afaghx/afx-core/src/repositories';

export interface PostgresConfig {
  url: string;
  maxConnections?: number;
  idleTimeoutSeconds?: number;
  connectTimeoutSeconds?: number;
}

export function createPostgresClient(config: PostgresConfig): Sql {
  if (!config.url) throw new Error('DATABASE_URL_REQUIRED');
  return postgres(config.url, {
    max: config.maxConnections ?? 10,
    idle_timeout: config.idleTimeoutSeconds ?? 20,
    connect_timeout: config.connectTimeoutSeconds ?? 10,
    prepare: true,
  });
}

function toIdentity(row: { id: string; subject: string; status: 'active' | 'locked' | 'disabled'; created_at: Date }): Identity {
  return {
    id: row.id,
    subject: row.subject,
    status: row.status === 'active' ? 'active' : row.status === 'disabled' ? 'disabled' : 'suspended',
    createdAt: row.created_at.toISOString(),
  };
}

function toSession(row: { id: string; identity_id: string; tenant_id: string; refresh_family_id: string; status: 'active' | 'revoked' | 'expired' | 'compromised'; created_at: Date; expires_at: Date; last_rotated_at: Date | null }): Session {
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

type DbLike = Sql | TransactionSql;

type SessionRow = {
  id: string; identity_id: string; tenant_id: string; refresh_family_id: string;
  status: Session['status']; created_at: Date; expires_at: Date; last_rotated_at: Date | null;
};

export class PostgresSessionRepository implements SessionRepository {
  constructor(private readonly db: DbLike) {}

  async get(id: UUID): Promise<Session | null> {
    const rows = await this.db<SessionRow[]>`
      SELECT id, identity_id, tenant_id, refresh_family_id, status, created_at, expires_at, last_rotated_at
      FROM sessions WHERE id = ${id} LIMIT 1
    `;
    return rows[0] ? toSession(rows[0]) : null;
  }

  async getForUpdate(id: UUID): Promise<Session | null> {
    const rows = await this.db<SessionRow[]>`
      SELECT id, identity_id, tenant_id, refresh_family_id, status, created_at, expires_at, last_rotated_at
      FROM sessions WHERE id = ${id} FOR UPDATE
    `;
    return rows[0] ? toSession(rows[0]) : null;
  }

  async revoke(id: UUID, reason: string): Promise<void> {
    await this.db`
      UPDATE sessions
      SET revoked_at = COALESCE(revoked_at, now()), revoke_reason = COALESCE(revoke_reason, ${reason})
      WHERE id = ${id}
    `;
  }
}

export class PostgresRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly db: DbLike) {}

  async findForUpdate(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const rows = await this.db<[{ session_id: string; family_id: string; token_hash: string; consumed_at: Date | null; revoked_at: Date | null; expires_at: Date }][]>`
      SELECT session_id, family_id, token_hash, consumed_at, revoked_at, expires_at
      FROM refresh_tokens WHERE token_hash = ${tokenHash} FOR UPDATE
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      sessionId: row.session_id,
      familyId: row.family_id,
      tokenHash: row.token_hash,
      usedAt: row.consumed_at?.toISOString() ?? null,
      revokedAt: row.revoked_at?.toISOString() ?? null,
      expiresAt: row.expires_at.toISOString(),
    };
  }

  async rotate(input: { current: RefreshTokenRecord; nextHash: string; now: string }): Promise<void> {
    const result = await this.db`
      UPDATE refresh_tokens
      SET consumed_at = ${input.now}
      WHERE token_hash = ${input.current.tokenHash}
        AND consumed_at IS NULL
        AND revoked_at IS NULL
    `;
    if (result.count !== 1) throw new Error('REFRESH_TOKEN_ROTATION_CONFLICT');

    await this.db`
      INSERT INTO refresh_tokens (id, session_id, family_id, token_hash, issued_at, expires_at)
      VALUES (gen_random_uuid(), ${input.current.sessionId}, ${input.current.familyId}, ${input.nextHash}, ${input.now}, ${input.current.expiresAt})
    `;
  }

  async revokeFamily(familyId: UUID, _reason: string, now: string): Promise<void> {
    await this.db`
      UPDATE refresh_tokens
      SET revoked_at = COALESCE(revoked_at, ${now})
      WHERE family_id = ${familyId} AND revoked_at IS NULL
    `;
  }

  async create(record: RefreshTokenRecord): Promise<void> {
    await this.db`
      INSERT INTO refresh_tokens (id, session_id, family_id, token_hash, issued_at, expires_at, consumed_at, revoked_at)
      VALUES (gen_random_uuid(), ${record.sessionId}, ${record.familyId}, ${record.tokenHash}, now(), ${record.expiresAt}, ${record.usedAt}, ${record.revokedAt})
    `;
  }
}

export class PostgresIdentityStore implements IdentityStore {
  constructor(private readonly db: Sql) {}

  async findBySubject(subject: string): Promise<Identity | null> {
    const rows = await this.db<[{ id: string; subject: string; status: 'active' | 'locked' | 'disabled'; created_at: Date }][]>`
      SELECT id, subject, status, created_at
      FROM identities WHERE subject = ${subject} AND status = 'active' LIMIT 1
    `;
    return rows[0] ? toIdentity(rows[0]) : null;
  }
}

export class PostgresMembershipStore implements MembershipStore {
  constructor(private readonly db: Sql) {}

  async resolve(subject: string, tenantId: UUID, organizationId: UUID): Promise<{ membershipId: UUID; roles: string[]; permissions: string[] } | null> {
    const membershipRows = await this.db<[{ id: string }][]>`
      SELECT m.id
      FROM memberships m
      JOIN identities i ON i.id = m.identity_id AND i.tenant_id = m.tenant_id
      WHERE i.subject = ${subject} AND m.tenant_id = ${tenantId}
        AND m.organization_id = ${organizationId}
        AND m.status = 'active' AND i.status = 'active'
      LIMIT 1
    `;
    const membership = membershipRows[0];
    if (!membership) return null;

    const [roleRows, permissionRows] = await Promise.all([
      this.db<{ role: string }[]>`SELECT role FROM membership_roles WHERE membership_id = ${membership.id} ORDER BY role`,
      this.db<{ permission: string }[]>`SELECT permission FROM membership_permissions WHERE membership_id = ${membership.id} ORDER BY permission`,
    ]);

    return {
      membershipId: membership.id,
      roles: roleRows.map((row) => row.role),
      permissions: permissionRows.map((row) => row.permission),
    };
  }
}

class PostgresTransactionContext implements TransactionContext {
  readonly refreshTokens: RefreshTokenStore;
  readonly sessions: TransactionalSessionStore;

  constructor(db: TransactionSql) {
    this.refreshTokens = new PostgresRefreshTokenRepository(db);
    this.sessions = new PostgresSessionRepository(db);
  }
}

export class PostgresTransactionRunner implements TransactionRunner {
  constructor(private readonly db: Sql) {}

  async transaction<T>(work: (context: TransactionContext) => Promise<T>): Promise<T> {
    return this.db.begin(async (tx) => work(new PostgresTransactionContext(tx)));
  }
}

export function createIdentityPersistence(db: Sql) {
  return {
    identities: new PostgresIdentityStore(db),
    memberships: new PostgresMembershipStore(db),
    sessions: new PostgresSessionRepository(db),
    refreshTokens: new PostgresRefreshTokenRepository(db),
    transactions: new PostgresTransactionRunner(db),
  };
}
