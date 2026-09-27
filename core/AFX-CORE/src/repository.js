export class AfxCoreRepository {
  async createUser() { throw new Error('not_implemented'); }
  async findUserByEmail() { throw new Error('not_implemented'); }
  async findUserById() { throw new Error('not_implemented'); }
  async listRolePermissions() { throw new Error('not_implemented'); }
  async createMembership() { throw new Error('not_implemented'); }
  async findMembership() { throw new Error('not_implemented'); }
  async grantRolePermission() { throw new Error('not_implemented'); }
  async hasRolePermission() { throw new Error('not_implemented'); }
  async createPolicy() { throw new Error('not_implemented'); }
  async listPolicies() { throw new Error('not_implemented'); }
  async createPolicyAudit() { throw new Error('not_implemented'); }
  async createSecurityAudit() { throw new Error('not_implemented'); }
  async listSecurityAudit() { throw new Error('not_implemented'); }
  async pruneSecurityAudit() { throw new Error('not_implemented'); }
  async createSession() { throw new Error('not_implemented'); }
  async findSessionByAccessDigest() { throw new Error('not_implemented'); }
  async createRefreshFamily() { throw new Error('not_implemented'); }
  async getRefreshToken() { throw new Error('not_implemented'); }
  async rotateRefreshToken() { throw new Error('not_implemented'); }
  async revokeRefreshFamily() { throw new Error('not_implemented'); }
  async revokeSession() { throw new Error('not_implemented'); }
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
CREATE TABLE IF NOT EXISTS afx_policies (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  rules JSONB NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS afx_policies_tenant_priority_idx ON afx_policies(tenant_id, priority DESC);
CREATE TABLE IF NOT EXISTS afx_policy_audit (
  id TEXT PRIMARY KEY,
  policy_id TEXT REFERENCES afx_policies(id),
  tenant_id TEXT,
  context JSONB NOT NULL,
  decision JSONB NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS afx_policy_audit_tenant_idx ON afx_policy_audit(tenant_id);
CREATE TABLE IF NOT EXISTS afx_security_audit (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  tenant_id TEXT,
  user_id TEXT,
  session_id TEXT,
  event JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS afx_security_audit_tenant_created_idx ON afx_security_audit(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS afx_security_audit_created_idx ON afx_security_audit(created_at DESC);
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
CREATE INDEX IF NOT EXISTS afx_sessions_family_idx ON afx_sessions(family_id);
CREATE INDEX IF NOT EXISTS afx_memberships_tenant_idx ON afx_memberships(tenant_id);
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
  async listRolePermissions(roles = []) {
    if (!Array.isArray(roles) || roles.length === 0) return [];
    const { rows } = await this.pool.query(
      'SELECT DISTINCT permission FROM afx_role_permissions WHERE role = ANY($1::text[]) ORDER BY permission',
      [roles]
    );
    return rows.map(row => row.permission);
  }
  async hasRolePermission(role, permission) {
    const { rowCount } = await this.pool.query('SELECT 1 FROM afx_role_permissions WHERE role=$1 AND permission=$2', [role,permission]);
    return rowCount === 1;
  }
  async createPolicy(policy) {
    await this.pool.query(
      `INSERT INTO afx_policies(id,tenant_id,name,description,rules,priority,active)
       VALUES($1,$2,$3,$4,$5::jsonb,$6,$7)
       ON CONFLICT(id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,name=EXCLUDED.name,description=EXCLUDED.description,rules=EXCLUDED.rules,priority=EXCLUDED.priority,active=EXCLUDED.active,updated_at=now()`,
      [policy.id, policy.tenantId, policy.name, policy.description, JSON.stringify(policy.rules), policy.priority, policy.active]
    );
  }
  async listPolicies(tenantId) {
    const { rows } = await this.pool.query(
      `SELECT id,tenant_id AS "tenantId",name,description,rules,priority,active
       FROM afx_policies
       WHERE active=true AND tenant_id=$1`,
      [tenantId]
    );
    return rows;
  }
  async createPolicyAudit(event) {
    await this.pool.query(
      `INSERT INTO afx_policy_audit(id,policy_id,tenant_id,context,decision,evaluated_at)
       VALUES($1,$2,$3,$4::jsonb,$5::jsonb,COALESCE($6::timestamptz, now()))`,
      [event.id, event.policyId, event.tenantId, JSON.stringify(event.context ?? {}), JSON.stringify(event.decision), event.decision?.evaluatedAt ?? null]
    );
  }
  async createSecurityAudit(event) {
    await this.pool.query(
      `INSERT INTO afx_security_audit(id,type,tenant_id,user_id,session_id,event,created_at)
       VALUES($1,$2,$3,$4,$5,$6::jsonb,COALESCE($7::timestamptz,now()))`,
      [event.id, event.type, event.tenantId ?? null, event.userId ?? null, event.sessionId ?? null, JSON.stringify(event.event ?? {}), event.createdAt ?? null]
    );
  }

  async listSecurityAudit({ tenantId, limit = 100 } = {}) {
    const { rows } = await this.pool.query(
      `SELECT id,type,tenant_id AS "tenantId",user_id AS "userId",session_id AS "sessionId",event,created_at AS "createdAt"
       FROM afx_security_audit
       WHERE tenant_id=$1
       ORDER BY created_at DESC
       LIMIT $2`,
      [tenantId, Math.min(Math.max(Number(limit) || 100, 1), 1000)]
    );
    return rows;
  }

  async pruneSecurityAudit(before) {
    const { rowCount } = await this.pool.query(
      'DELETE FROM afx_security_audit WHERE created_at < $1::timestamptz',
      [before]
    );
    return rowCount;
  }
  async createSession(s) {
    await this.pool.query('INSERT INTO afx_sessions(id,user_id,tenant_id,family_id,access_digest,access_expires_at,revoked) VALUES($1,$2,$3,$4,$5,to_timestamp($6/1000.0),$7)', [s.id,s.userId,s.tenantId,s.familyId,s.accessDigest,s.accessExpiresAt,s.revoked]);
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
  async rotateRefreshToken({digest,newDigest,newAccessDigest,now,accessExpiresAt}) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT family_id AS "familyId",used FROM afx_refresh_tokens WHERE digest=$1 FOR UPDATE', [digest]);
      if (!rows[0]) throw new Error('invalid_refresh_token');
      const { rows: families } = await client.query('SELECT id,current_digest AS "currentDigest",revoked,expires_at AS "expiresAt" FROM afx_refresh_families WHERE id=$1 FOR UPDATE', [rows[0].familyId]);
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
