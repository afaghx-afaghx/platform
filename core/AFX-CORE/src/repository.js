import { normalizeEmail, hashPassword, verifyPassword, randomToken, tokenDigest, SECURITY_PARAMETERS } from './security.js';

export class AfxCoreRepository {
  async createUser() { throw new Error('not_implemented'); }
  async findUserByEmail() { throw new Error('not_implemented'); }
  async findUserById() { throw new Error('not_implemented'); }
  async createMembership() { throw new Error('not_implemented'); }
  async findMembership() { throw new Error('not_implemented'); }
  async grantRolePermission() { throw new Error('not_implemented'); }
  async hasRolePermission() { throw new Error('not_implemented'); }
  async createSession() { throw new Error('not_implemented'); }
  async createAuthenticationSession() { throw new Error('not_implemented'); }
  async findSessionByAccessDigest() { throw new Error('not_implemented'); }
  async createRefreshFamily() { throw new Error('not_implemented'); }
  async getRefreshToken() { throw new Error('not_implemented'); }
  async rotateRefreshToken() { throw new Error('not_implemented'); }
  async revokeRefreshFamily() { throw new Error('not_implemented'); }
  async revokeSession() { throw new Error('not_implemented'); }
  async appendAuditEvent() { throw new Error('not_implemented'); }
  async checkAndRecordAuthRateLimit() { throw new Error('not_implemented'); }
}

export const AFX_CORE_SCHEMA = `
CREATE TABLE IF NOT EXISTS afx_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS afx_memberships (
  user_id TEXT NOT NULL REFERENCES afx_users(id),
  tenant_id TEXT NOT NULL,
  roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('active','disabled')),
  PRIMARY KEY (user_id, tenant_id)
);
CREATE TABLE IF NOT EXISTS afx_role_permissions (
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role, permission)
);
CREATE TABLE IF NOT EXISTS afx_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES afx_users(id),
  tenant_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  access_digest TEXT NOT NULL UNIQUE,
  access_expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS afx_refresh_families (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES afx_users(id),
  tenant_id TEXT NOT NULL,
  current_digest TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  version BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS afx_refresh_tokens (
  digest TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES afx_refresh_families(id),
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS afx_audit_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (length(btrim(event_type)) > 0),
  user_id TEXT,
  tenant_id TEXT,
  session_id TEXT,
  family_id TEXT,
  email TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS afx_auth_rate_limits (
  scope TEXT NOT NULL CHECK (length(btrim(scope)) > 0),
  key_digest TEXT NOT NULL CHECK (length(btrim(key_digest)) > 0),
  window_started_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL CHECK (attempt_count >= 0),
  PRIMARY KEY (scope, key_digest)
);
CREATE INDEX IF NOT EXISTS afx_sessions_family_idx ON afx_sessions(family_id);
CREATE INDEX IF NOT EXISTS afx_memberships_tenant_idx ON afx_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS afx_audit_events_tenant_time_idx ON afx_audit_events(tenant_id, occurred_at);
CREATE INDEX IF NOT EXISTS afx_audit_events_time_idx ON afx_audit_events(occurred_at);
CREATE INDEX IF NOT EXISTS afx_auth_rate_limits_window_idx ON afx_auth_rate_limits(window_started_at);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'afx_sessions_family_fk'
  ) THEN
    ALTER TABLE afx_sessions
      ADD CONSTRAINT afx_sessions_family_fk
      FOREIGN KEY (family_id) REFERENCES afx_refresh_families(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'afx_memberships_tenant_nonempty'
  ) THEN
    ALTER TABLE afx_memberships
      ADD CONSTRAINT afx_memberships_tenant_nonempty
      CHECK (length(btrim(tenant_id)) > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'afx_sessions_tenant_nonempty'
  ) THEN
    ALTER TABLE afx_sessions
      ADD CONSTRAINT afx_sessions_tenant_nonempty
      CHECK (length(btrim(tenant_id)) > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'afx_refresh_families_tenant_nonempty'
  ) THEN
    ALTER TABLE afx_refresh_families
      ADD CONSTRAINT afx_refresh_families_tenant_nonempty
      CHECK (length(btrim(tenant_id)) > 0);
  END IF;
END $$;
`;

export class PostgresAfxCoreRepository extends AfxCoreRepository {
  constructor(pool) { super(); this.pool = pool; }

  async migrate() { await this.pool.query(AFX_CORE_SCHEMA); }

  async createUser(user) {
    await this.pool.query('INSERT INTO afx_users(id,email,password_hash,status) VALUES($1,$2,$3,$4)', [user.id,user.email,user.passwordHash,user.status]);
  }
  async findUserByEmail(email) {
    const { rows } = await this.pool.query('SELECT id,email,password_hash AS "passwordHash",status FROM afx_users WHERE email=$1', [email]);
    return rows[0] ?? null;
  }
  async findUserById(id) {
    const { rows } = await this.pool.query('SELECT id,email,password_hash AS "passwordHash",status FROM afx_users WHERE id=$1', [id]);
    return rows[0] ?? null;
  }
  async createMembership(m) {
    await this.pool.query('INSERT INTO afx_memberships(user_id,tenant_id,roles,status) VALUES($1,$2,$3,$4) ON CONFLICT (user_id,tenant_id) DO UPDATE SET roles=EXCLUDED.roles,status=EXCLUDED.status', [m.userId,m.tenantId,JSON.stringify(m.roles),m.status]);
  }
  async findMembership(userId, tenantId) {
    const { rows } = await this.pool.query('SELECT user_id AS "userId",tenant_id AS "tenantId",roles,status FROM afx_memberships WHERE user_id=$1 AND tenant_id=$2', [userId,tenantId]);
    return rows[0] ?? null;
  }
  async grantRolePermission(role, permission) {
    await this.pool.query('INSERT INTO afx_role_permissions(role,permission) VALUES($1,$2) ON CONFLICT DO NOTHING', [role,permission]);
  }
  async hasRolePermission(role, permission) {
    const { rowCount } = await this.pool.query('SELECT 1 FROM afx_role_permissions WHERE role=$1 AND permission=$2', [role,permission]);
    return rowCount === 1;
  }
  async createSession(s) {
    await this.pool.query('INSERT INTO afx_sessions(id,user_id,tenant_id,family_id,access_digest,access_expires_at,revoked) VALUES($1,$2,$3,$4,$5,to_timestamp($6/1000.0),$7)', [s.id,s.userId,s.tenantId,s.familyId,s.accessDigest,s.accessExpiresAt,s.revoked]);
  }
  async createAuthenticationSession({ family, session, refreshToken }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO afx_refresh_families(id,user_id,tenant_id,current_digest,expires_at,revoked) VALUES($1,$2,$3,$4,to_timestamp($5/1000.0),$6)', [family.id,family.userId,family.tenantId,family.currentDigest,family.expiresAt,family.revoked]);
      await client.query('INSERT INTO afx_sessions(id,user_id,tenant_id,family_id,access_digest,access_expires_at,revoked) VALUES($1,$2,$3,$4,$5,to_timestamp($6/1000.0),$7)', [session.id,session.userId,session.tenantId,session.familyId,session.accessDigest,session.accessExpiresAt,session.revoked]);
      await client.query('INSERT INTO afx_refresh_tokens(digest,family_id,used) VALUES($1,$2,$3)', [refreshToken.digest,refreshToken.familyId,refreshToken.used]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async findSessionByAccessDigest(digest) {
    const { rows } = await this.pool.query('SELECT id,user_id AS "userId",tenant_id AS "tenantId",family_id AS "familyId",access_digest AS "accessDigest",EXTRACT(EPOCH FROM access_expires_at)*1000 AS "accessExpiresAt",revoked FROM afx_sessions WHERE access_digest=$1', [digest]);
    return rows[0] ? {...rows[0], accessExpiresAt:Number(rows[0].accessExpiresAt)} : null;
  }
  async createRefreshFamily(f) {
    await this.pool.query('INSERT INTO afx_refresh_families(id,user_id,tenant_id,current_digest,expires_at,revoked) VALUES($1,$2,$3,$4,to_timestamp($5/1000.0),$6)', [f.id,f.userId,f.tenantId,f.currentDigest,f.expiresAt,f.revoked]);
  }
  async getRefreshToken(digest) {
    const { rows } = await this.pool.query('SELECT digest,family_id AS "familyId",used FROM afx_refresh_tokens WHERE digest=$1', [digest]);
    return rows[0] ?? null;
  }
  async createRefreshToken(r) {
    await this.pool.query('INSERT INTO afx_refresh_tokens(digest,family_id,used) VALUES($1,$2,$3)', [r.digest,r.familyId,r.used]);
  }
  async appendAuditEvent(event) {
    const { rows } = await this.pool.query(
      `INSERT INTO afx_audit_events(event_type,user_id,tenant_id,session_id,family_id,email)
       VALUES($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [event.type, event.userId ?? null, event.tenantId ?? null, event.sessionId ?? null, event.familyId ?? null, event.email ?? null]
    );
    return rows[0]?.id ?? null;
  }
  async checkAndRecordAuthRateLimit({ scope, keyDigest, max, windowMs, now }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'SELECT window_started_at AS "windowStartedAt", attempt_count AS "attemptCount" FROM afx_auth_rate_limits WHERE scope=$1 AND key_digest=$2 FOR UPDATE',
        [scope, keyDigest]
      );
      const current = new Date(now);
      let windowStartedAt = current;
      let attemptCount = 1;

      if (rows[0]) {
        const existingStart = new Date(rows[0].windowStartedAt);
        if (current.getTime() - existingStart.getTime() < windowMs) {
          windowStartedAt = existingStart;
          attemptCount = Number(rows[0].attemptCount) + 1;
        }
      }

      await client.query(
        'INSERT INTO afx_auth_rate_limits(scope,key_digest,window_started_at,attempt_count) VALUES($1,$2,$3,$4) ON CONFLICT (scope,key_digest) DO UPDATE SET window_started_at=EXCLUDED.window_started_at,attempt_count=EXCLUDED.attempt_count',
        [scope, keyDigest, windowStartedAt, attemptCount]
      );
      await client.query('COMMIT');

      const elapsed = current.getTime() - windowStartedAt.getTime();
      const allowed = attemptCount <= max;
      return {
        allowed,
        remaining: Math.max(0, max - attemptCount),
        retryAfterMs: allowed ? 0 : Math.max(0, windowMs - elapsed)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async rotateRefreshToken({digest,newDigest,newAccessDigest,now,accessExpiresAt}) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT family_id AS "familyId",used FROM afx_refresh_tokens WHERE digest=$1 FOR UPDATE', [digest]);
      if (!rows[0]) throw new Error('invalid_refresh_token');
      const { rows: families } = await client.query('SELECT id,user_id AS "userId",tenant_id AS "tenantId",current_digest AS "currentDigest",revoked,expires_at AS "expiresAt" FROM afx_refresh_families WHERE id=$1 FOR UPDATE', [rows[0].familyId]);
      const family = families[0];
      if (!family || new Date(family.expiresAt).getTime() <= now) throw new Error('invalid_refresh_token');
      if (family.revoked || rows[0].used || family.currentDigest !== digest) throw new Error('refresh_reuse_detected');

      const { rowCount: activeSessions } = await client.query('SELECT 1 FROM afx_sessions WHERE family_id=$1 AND revoked=false FOR UPDATE', [family.id]);
      if (activeSessions !== 1) throw new Error('unauthorized');

      await client.query('UPDATE afx_refresh_tokens SET used=true WHERE digest=$1', [digest]);
      await client.query('INSERT INTO afx_refresh_tokens(digest,family_id,used) VALUES($1,$2,false)', [newDigest,family.id]);
      await client.query('UPDATE afx_refresh_families SET current_digest=$1,version=version+1 WHERE id=$2', [newDigest,family.id]);
      await client.query('UPDATE afx_sessions SET access_digest=$1,access_expires_at=to_timestamp($2/1000.0) WHERE family_id=$3 AND revoked=false', [newAccessDigest,accessExpiresAt,family.id]);
      await client.query('COMMIT');
      return family;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async revokeRefreshFamily(familyId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE afx_refresh_families SET revoked=true WHERE id=$1', [familyId]);
      await client.query('UPDATE afx_sessions SET revoked=true WHERE family_id=$1', [familyId]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async revokeSession(sessionId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT family_id AS "familyId" FROM afx_sessions WHERE id=$1 FOR UPDATE', [sessionId]);
      if (!rows[0]) { await client.query('COMMIT'); return; }
      await client.query('UPDATE afx_sessions SET revoked=true WHERE id=$1', [sessionId]);
      await client.query('UPDATE afx_refresh_families SET revoked=true WHERE id=$1', [rows[0].familyId]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
}
