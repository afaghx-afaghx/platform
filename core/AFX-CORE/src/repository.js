export class AfxCoreRepository {
  async createUser() { throw new Error('not_implemented'); }
  async findUserByEmail() { throw new Error('not_implemented'); }
  async findUserById() { throw new Error('not_implemented'); }
  async createMembership() { throw new Error('not_implemented'); }
  async findMembership() { throw new Error('not_implemented'); }
  async grantRolePermission() { throw new Error('not_implemented'); }
  async hasRolePermission() { throw new Error('not_implemented'); }
  async createSession() { throw new Error('not_implemented'); }
  async findSessionByAccessDigest() { throw new Error('not_implemented'); }
  async createRefreshFamily() { throw new Error('not_implemented'); }
  async getRefreshToken() { throw new Error('not_implemented'); }
  async createRefreshToken() { throw new Error('not_implemented'); }
  async rotateRefreshToken() { throw new Error('not_implemented'); }
  async revokeRefreshFamily() { throw new Error('not_implemented'); }
  async revokeSession() { throw new Error('not_implemented'); }
  async getMfaFactor() { throw new Error('not_implemented'); }
  async upsertMfaFactor() { throw new Error('not_implemented'); }
  async revokeMfaFactor() { throw new Error('not_implemented'); }
  async replaceMfaRecoveryCodes() { throw new Error('not_implemented'); }
  async consumeMfaRecoveryCode() { throw new Error('not_implemented'); }
  async createMfaChallenge() { throw new Error('not_implemented'); }
  async getMfaChallenge() { throw new Error('not_implemented'); }
  async incrementMfaChallengeAttempt() { throw new Error('not_implemented'); }
  async consumeMfaChallenge() { throw new Error('not_implemented'); }
  async acceptTotpStep() { throw new Error('not_implemented'); }
  async createWebAuthnChallenge() { throw new Error('not_implemented'); }
  async getWebAuthnChallenge() { throw new Error('not_implemented'); }
  async consumeWebAuthnChallenge() { throw new Error('not_implemented'); }
  async createWebAuthnCredential() { throw new Error('not_implemented'); }
  async findWebAuthnCredential() { throw new Error('not_implemented'); }
  async listWebAuthnCredentials() { throw new Error('not_implemented'); }
  async revokeWebAuthnCredential() { throw new Error('not_implemented'); }
  async updateWebAuthnSignCount() { throw new Error('not_implemented'); }
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
CREATE TABLE IF NOT EXISTS afx_mfa_factors (
  user_id TEXT PRIMARY KEY REFERENCES afx_users(id),
  secret_encrypted TEXT NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  last_totp_step BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS afx_mfa_recovery_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES afx_users(id),
  code_digest TEXT NOT NULL UNIQUE,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS afx_mfa_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES afx_users(id),
  tenant_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS afx_webauthn_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('registration','authentication')),
  challenge TEXT NOT NULL UNIQUE,
  rp_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS afx_webauthn_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES afx_users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  aaguid TEXT NOT NULL,
  sign_count BIGINT NOT NULL DEFAULT 0,
  backup_eligible BOOLEAN NOT NULL DEFAULT false,
  backup_state BOOLEAN NOT NULL DEFAULT false,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS afx_sessions_family_idx ON afx_sessions(family_id);
CREATE INDEX IF NOT EXISTS afx_memberships_tenant_idx ON afx_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS afx_mfa_challenges_user_idx ON afx_mfa_challenges(user_id, consumed);
CREATE INDEX IF NOT EXISTS afx_mfa_recovery_user_idx ON afx_mfa_recovery_codes(user_id, used);
CREATE INDEX IF NOT EXISTS afx_webauthn_challenges_user_idx ON afx_webauthn_challenges(user_id, consumed);
CREATE INDEX IF NOT EXISTS afx_webauthn_credentials_user_idx ON afx_webauthn_credentials(user_id, revoked);
`;

export class PostgresAfxCoreRepository extends AfxCoreRepository {
  constructor(pool) { super(); this.pool = pool; }

  async migrate() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtext('afx-core-schema-migration'))");
      await client.query(AFX_CORE_SCHEMA);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async createUser(user) { await this.pool.query('INSERT INTO afx_users(id,email,password_hash,status) VALUES($1,$2,$3,$4)', [user.id,user.email,user.passwordHash,user.status]); }
  async findUserByEmail(email) { const { rows } = await this.pool.query('SELECT id,email,password_hash AS "passwordHash",status FROM afx_users WHERE email=$1', [email]); return rows[0] ?? null; }
  async findUserById(id) { const { rows } = await this.pool.query('SELECT id,email,password_hash AS "passwordHash",status FROM afx_users WHERE id=$1', [id]); return rows[0] ?? null; }
  async createMembership(m) { await this.pool.query('INSERT INTO afx_memberships(user_id,tenant_id,roles,status) VALUES($1,$2,$3,$4) ON CONFLICT (user_id,tenant_id) DO UPDATE SET roles=EXCLUDED.roles,status=EXCLUDED.status', [m.userId,m.tenantId,JSON.stringify(m.roles),m.status]); }
  async findMembership(userId, tenantId) { const { rows } = await this.pool.query('SELECT user_id AS "userId",tenant_id AS "tenantId",roles,status FROM afx_memberships WHERE user_id=$1 AND tenant_id=$2', [userId,tenantId]); return rows[0] ?? null; }
  async grantRolePermission(role, permission) { await this.pool.query('INSERT INTO afx_role_permissions(role,permission) VALUES($1,$2) ON CONFLICT DO NOTHING', [role,permission]); }
  async hasRolePermission(role, permission) { const { rowCount } = await this.pool.query('SELECT 1 FROM afx_role_permissions WHERE role=$1 AND permission=$2', [role,permission]); return rowCount === 1; }
  async createSession(s) { await this.pool.query('INSERT INTO afx_sessions(id,user_id,tenant_id,family_id,access_digest,access_expires_at,revoked) VALUES($1,$2,$3,$4,$5,to_timestamp($6/1000.0),$7)', [s.id,s.userId,s.tenantId,s.familyId,s.accessDigest,s.accessExpiresAt,s.revoked]); }
  async findSessionByAccessDigest(digest) { const { rows } = await this.pool.query('SELECT id,user_id AS "userId",tenant_id AS "tenantId",family_id AS "familyId",access_digest AS "accessDigest",EXTRACT(EPOCH FROM access_expires_at)*1000 AS "accessExpiresAt",revoked FROM afx_sessions WHERE access_digest=$1', [digest]); return rows[0] ? {...rows[0], accessExpiresAt:Number(rows[0].accessExpiresAt)} : null; }
  async createRefreshFamily(f) { await this.pool.query('INSERT INTO afx_refresh_families(id,user_id,tenant_id,current_digest,expires_at,revoked) VALUES($1,$2,$3,$4,to_timestamp($5/1000.0),$6)', [f.id,f.userId,f.tenantId,f.currentDigest,f.expiresAt,f.revoked]); }
  async getRefreshToken(digest) { const { rows } = await this.pool.query('SELECT digest,family_id AS "familyId",used FROM afx_refresh_tokens WHERE digest=$1', [digest]); return rows[0] ?? null; }
  async createRefreshToken(r) { await this.pool.query('INSERT INTO afx_refresh_tokens(digest,family_id,used) VALUES($1,$2,$3)', [r.digest,r.familyId,r.used]); }
  async rotateRefreshToken({digest,newDigest,newAccessDigest,now,accessExpiresAt}) { const client = await this.pool.connect(); try { await client.query('BEGIN'); const { rows } = await client.query('SELECT family_id AS "familyId",used FROM afx_refresh_tokens WHERE digest=$1 FOR UPDATE', [digest]); if (!rows[0]) throw new Error('invalid_refresh_token'); const { rows: families } = await client.query('SELECT id,current_digest AS "currentDigest",revoked,expires_at AS "expiresAt",user_id AS "userId",tenant_id AS "tenantId" FROM afx_refresh_families WHERE id=$1 FOR UPDATE', [rows[0].familyId]); const family = families[0]; if (!family || new Date(family.expiresAt).getTime() <= now) throw new Error('invalid_refresh_token'); if (family.revoked || rows[0].used || family.currentDigest !== digest) throw new Error('refresh_reuse_detected'); const { rowCount: activeSessions } = await client.query('SELECT 1 FROM afx_sessions WHERE family_id=$1 AND revoked=false FOR UPDATE', [family.id]); if (activeSessions !== 1) throw new Error('unauthorized'); await client.query('UPDATE afx_refresh_tokens SET used=true WHERE digest=$1', [digest]); await client.query('INSERT INTO afx_refresh_tokens(digest,family_id,used) VALUES($1,$2,false)', [newDigest,family.id]); await client.query('UPDATE afx_refresh_families SET current_digest=$1,version=version+1 WHERE id=$2', [newDigest,family.id]); await client.query('UPDATE afx_sessions SET access_digest=$1,access_expires_at=to_timestamp($2/1000.0) WHERE family_id=$3 AND revoked=false', [newAccessDigest,accessExpiresAt,family.id]); await client.query('COMMIT'); return family; } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); } }
  async revokeRefreshFamily(familyId) { const client = await this.pool.connect(); try { await client.query('BEGIN'); await client.query('UPDATE afx_refresh_families SET revoked=true WHERE id=$1', [familyId]); await client.query('UPDATE afx_sessions SET revoked=true WHERE family_id=$1', [familyId]); await client.query('COMMIT'); } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); } }
  async revokeSession(sessionId) { const client = await this.pool.connect(); try { await client.query('BEGIN'); const { rows } = await client.query('SELECT family_id AS "familyId" FROM afx_sessions WHERE id=$1 FOR UPDATE', [sessionId]); if (!rows[0]) { await client.query('COMMIT'); return; } await client.query('UPDATE afx_sessions SET revoked=true WHERE id=$1', [sessionId]); await client.query('UPDATE afx_refresh_families SET revoked=true WHERE id=$1', [rows[0].familyId]); await client.query('COMMIT'); } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); } }
  async getMfaFactor(userId) { const { rows } = await this.pool.query('SELECT user_id AS "userId",secret_encrypted AS "secretEncrypted",version,active,last_totp_step AS "lastTotpStep" FROM afx_mfa_factors WHERE user_id=$1', [userId]); return rows[0] ? {...rows[0], lastTotpStep: rows[0].lastTotpStep === null ? null : Number(rows[0].lastTotpStep)} : null; }
  async upsertMfaFactor({userId,secretEncrypted,version=1,active=true,lastTotpStep=null}) { await this.pool.query('INSERT INTO afx_mfa_factors(user_id,secret_encrypted,version,active,last_totp_step,revoked_at) VALUES($1,$2,$3,$4,$5,NULL) ON CONFLICT(user_id) DO UPDATE SET secret_encrypted=EXCLUDED.secret_encrypted,version=EXCLUDED.version,active=EXCLUDED.active,last_totp_step=EXCLUDED.last_totp_step,revoked_at=NULL', [userId,secretEncrypted,version,active,lastTotpStep]); }
  async revokeMfaFactor(userId) { const { rowCount } = await this.pool.query('UPDATE afx_mfa_factors SET active=false,version=version+1,revoked_at=now() WHERE user_id=$1 AND active=true', [userId]); return rowCount === 1; }
  async replaceMfaRecoveryCodes(userId, codeDigests) { const client = await this.pool.connect(); try { await client.query('BEGIN'); await client.query('DELETE FROM afx_mfa_recovery_codes WHERE user_id=$1', [userId]); for (const item of codeDigests) await client.query('INSERT INTO afx_mfa_recovery_codes(id,user_id,code_digest,used) VALUES($1,$2,$3,false)', [item.id,userId,item.codeDigest]); await client.query('COMMIT'); } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); } }
  async consumeMfaRecoveryCode({userId,codeDigest}) { const { rowCount } = await this.pool.query('UPDATE afx_mfa_recovery_codes SET used=true,used_at=now() WHERE user_id=$1 AND code_digest=$2 AND used=false', [userId,codeDigest]); return rowCount === 1; }
  async createMfaChallenge(c) { await this.pool.query('INSERT INTO afx_mfa_challenges(id,user_id,tenant_id,expires_at,attempts,consumed) VALUES($1,$2,$3,to_timestamp($4/1000.0),0,false)', [c.id,c.userId,c.tenantId,c.expiresAt]); }
  async getMfaChallenge(id) { const { rows } = await this.pool.query('SELECT id,user_id AS "userId",tenant_id AS "tenantId",EXTRACT(EPOCH FROM expires_at)*1000 AS "expiresAt",attempts,consumed FROM afx_mfa_challenges WHERE id=$1', [id]); return rows[0] ? {...rows[0], expiresAt:Number(rows[0].expiresAt)} : null; }
  async incrementMfaChallengeAttempt({id,maxAttempts,now}) { const { rows } = await this.pool.query('UPDATE afx_mfa_challenges SET attempts=attempts+1 WHERE id=$1 AND consumed=false AND attempts < $2 AND expires_at > to_timestamp($3/1000.0) RETURNING attempts', [id,maxAttempts,now]); return rows[0]?.attempts ?? null; }
  async consumeMfaChallenge({id,maxAttempts,now}) { const { rowCount } = await this.pool.query('UPDATE afx_mfa_challenges SET consumed=true WHERE id=$1 AND consumed=false AND attempts < $2 AND expires_at > to_timestamp($3/1000.0)', [id,maxAttempts,now]); return rowCount === 1; }
  async acceptTotpStep({userId,step}) { const { rowCount } = await this.pool.query('UPDATE afx_mfa_factors SET last_totp_step=$2 WHERE user_id=$1 AND active=true AND (last_totp_step IS NULL OR last_totp_step < $2)', [userId,step]); return rowCount === 1; }
  async createWebAuthnChallenge(c) { await this.pool.query('INSERT INTO afx_webauthn_challenges(id,user_id,kind,challenge,rp_id,expires_at,consumed) VALUES($1,$2,$3,$4,$5,to_timestamp($6/1000.0),false)', [c.id,c.userId,c.kind,c.challenge,c.rpId,c.expiresAt]); }
  async getWebAuthnChallenge(id) { const { rows } = await this.pool.query('SELECT id,user_id AS "userId",kind,challenge,rp_id AS "rpId",EXTRACT(EPOCH FROM expires_at)*1000 AS "expiresAt",consumed FROM afx_webauthn_challenges WHERE id=$1', [id]); return rows[0] ? {...rows[0], expiresAt:Number(rows[0].expiresAt)} : null; }
  async consumeWebAuthnChallenge({id}) { const { rowCount } = await this.pool.query('UPDATE afx_webauthn_challenges SET consumed=true WHERE id=$1 AND consumed=false AND expires_at > now()', [id]); return rowCount === 1; }
  async createWebAuthnCredential(c) { await this.pool.query('INSERT INTO afx_webauthn_credentials(id,user_id,public_key,aaguid,sign_count,backup_eligible,backup_state,revoked,created_at,last_used_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,to_timestamp($9/1000.0),NULL)', [c.id,c.userId,c.publicKey,c.aaguid,c.signCount,c.backupEligible,c.backupState,c.revoked,c.createdAt]); }
  async findWebAuthnCredential(id) { const { rows } = await this.pool.query('SELECT id,user_id AS "userId",public_key AS "publicKey",aaguid,sign_count AS "signCount",backup_eligible AS "backupEligible",backup_state AS "backupState",revoked,EXTRACT(EPOCH FROM created_at)*1000 AS "createdAt",EXTRACT(EPOCH FROM last_used_at)*1000 AS "lastUsedAt" FROM afx_webauthn_credentials WHERE id=$1', [id]); return rows[0] ? {...rows[0], signCount:Number(rows[0].signCount), createdAt:Number(rows[0].createdAt), lastUsedAt: rows[0].lastUsedAt === null ? null : Number(rows[0].lastUsedAt)} : null; }
  async listWebAuthnCredentials(userId) { const { rows } = await this.pool.query('SELECT id,aaguid,sign_count AS "signCount",backup_eligible AS "backupEligible",backup_state AS "backupState",revoked,EXTRACT(EPOCH FROM created_at)*1000 AS "createdAt",EXTRACT(EPOCH FROM last_used_at)*1000 AS "lastUsedAt" FROM afx_webauthn_credentials WHERE user_id=$1 ORDER BY created_at ASC', [userId]); return rows.map(row => ({...row, signCount:Number(row.signCount), createdAt:Number(row.createdAt), lastUsedAt:row.lastUsedAt===null?null:Number(row.lastUsedAt)})); }
  async revokeWebAuthnCredential(id) { const { rowCount } = await this.pool.query('UPDATE afx_webauthn_credentials SET revoked=true WHERE id=$1 AND revoked=false', [id]); return rowCount === 1; }
  async updateWebAuthnSignCount({id,signCount,now,backupState}) { const client = await this.pool.connect(); try { await client.query('BEGIN'); const { rows } = await client.query('SELECT sign_count AS "signCount",revoked FROM afx_webauthn_credentials WHERE id=$1 FOR UPDATE', [id]); const current = rows[0]; if (!current || current.revoked) { await client.query('ROLLBACK'); return false; } if (Number(current.signCount) !== 0 && signCount !== 0 && signCount <= Number(current.signCount)) { await client.query('ROLLBACK'); return false; } await client.query('UPDATE afx_webauthn_credentials SET sign_count=$1,last_used_at=to_timestamp($2/1000.0),backup_state=$3 WHERE id=$4', [signCount,now,backupState,id]); await client.query('COMMIT'); return true; } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); } }
}
