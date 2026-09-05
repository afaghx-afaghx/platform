import { migrateAfxCore } from './migrations.js';
import { createHash } from 'node:crypto';

function auditHash(event, previousHash = '') {
  const canonical = JSON.stringify({ ...event, integrityPrevHash: previousHash });
  return createHash('sha256').update(canonical).digest('hex');
}

function assertAuditMetadataSafe(metadata) {
  const serialized = JSON.stringify(metadata ?? {});
  if (/(password|token|secret|authorization|cookie)/i.test(serialized)) throw new Error('audit_sensitive_metadata');
}

export class AfxCoreRepository {
  async createUser() { throw new Error('not_implemented'); }
  async findUserByEmail() { throw new Error('not_implemented'); }
  async findUserById() { throw new Error('not_implemented'); }
  async updateUserStatus() { throw new Error('not_implemented'); }
  async updateUserPassword() { throw new Error('not_implemented'); }
  async createMembership() { throw new Error('not_implemented'); }
  async findMembership() { throw new Error('not_implemented'); }
  async grantRolePermission() { throw new Error('not_implemented'); }
  async hasRolePermission() { throw new Error('not_implemented'); }
  async createSession() { throw new Error('not_implemented'); }
  async findSessionByAccessDigest() { throw new Error('not_implemented'); }
  async createRefreshFamily() { throw new Error('not_implemented'); }
  async getRefreshToken() { throw new Error('not_implemented'); }
  async rotateRefreshToken() { throw new Error('not_implemented'); }
  async revokeRefreshFamily() { throw new Error('not_implemented'); }
  async revokeSession() { throw new Error('not_implemented'); }
  async revokeUserSessions() { throw new Error('not_implemented'); }
  async createRecoveryToken() { throw new Error('not_implemented'); }
  async consumeRecoveryToken() { throw new Error('not_implemented'); }
  async appendSecurityAudit() { throw new Error('not_implemented'); }
  async listSecurityAudit() { throw new Error('not_implemented'); }
  async purgeExpiredAudit() { throw new Error('not_implemented'); }
}

export class PostgresAfxCoreRepository extends AfxCoreRepository {
  constructor(pool) { super(); this.pool = pool; }
  async migrate() { return migrateAfxCore(this.pool); }
  async createUser(user) { await this.pool.query('INSERT INTO afx_users(id,email,password_hash,status) VALUES($1,$2,$3,$4)', [user.id,user.email,user.passwordHash,user.status]); }
  async findUserByEmail(email) { const { rows } = await this.pool.query('SELECT id,email,password_hash AS "passwordHash",status FROM afx_users WHERE email=$1', [email]); return rows[0] ?? null; }
  async findUserById(id) { const { rows } = await this.pool.query('SELECT id,email,password_hash AS "passwordHash",status FROM afx_users WHERE id=$1', [id]); return rows[0] ?? null; }
  async updateUserStatus(userId, status) { await this.pool.query('UPDATE afx_users SET status=$1,updated_at=now() WHERE id=$2', [status,userId]); }
  async updateUserPassword(userId, passwordHash) { await this.pool.query('UPDATE afx_users SET password_hash=$1,status=\'active\',updated_at=now() WHERE id=$2', [passwordHash,userId]); }
  async createMembership(m) { await this.pool.query('INSERT INTO afx_memberships(user_id,tenant_id,roles,status) VALUES($1,$2,$3,$4) ON CONFLICT (user_id,tenant_id) DO UPDATE SET roles=EXCLUDED.roles,status=EXCLUDED.status', [m.userId,m.tenantId,JSON.stringify(m.roles),m.status]); }
  async findMembership(userId, tenantId) { const { rows } = await this.pool.query('SELECT user_id AS "userId",tenant_id AS "tenantId",roles,status FROM afx_memberships WHERE user_id=$1 AND tenant_id=$2', [userId,tenantId]); return rows[0] ?? null; }
  async grantRolePermission(role, permission) { await this.pool.query('INSERT INTO afx_role_permissions(role,permission) VALUES($1,$2) ON CONFLICT DO NOTHING', [role,permission]); }
  async hasRolePermission(role, permission) { const { rowCount } = await this.pool.query('SELECT 1 FROM afx_role_permissions WHERE role=$1 AND permission=$2', [role,permission]); return rowCount === 1; }
  async createSession(s) { await this.pool.query('INSERT INTO afx_sessions(id,user_id,tenant_id,family_id,access_digest,access_expires_at,revoked) VALUES($1,$2,$3,$4,$5,to_timestamp($6/1000.0),$7)', [s.id,s.userId,s.tenantId,s.familyId,s.accessDigest,s.accessExpiresAt,s.revoked]); }
  async findSessionByAccessDigest(digest) { const { rows } = await this.pool.query('SELECT id,user_id AS "userId",tenant_id AS "tenantId",family_id AS "familyId",access_digest AS "accessDigest",EXTRACT(EPOCH FROM access_expires_at)*1000 AS "accessExpiresAt",revoked FROM afx_sessions WHERE access_digest=$1', [digest]); return rows[0] ? {...rows[0], accessExpiresAt:Number(rows[0].accessExpiresAt)} : null; }
  async createRefreshFamily(f) { await this.pool.query('INSERT INTO afx_refresh_families(id,user_id,tenant_id,current_digest,expires_at,revoked) VALUES($1,$2,$3,$4,to_timestamp($5/1000.0),$6)', [f.id,f.userId,f.tenantId,f.currentDigest,f.expiresAt,f.revoked]); }
  async getRefreshToken(digest) { const { rows } = await this.pool.query('SELECT digest,family_id AS "familyId",used FROM afx_refresh_tokens WHERE digest=$1', [digest]); return rows[0] ?? null; }
  async createRefreshToken(r) { await this.pool.query('INSERT INTO afx_refresh_tokens(digest,family_id,used) VALUES($1,$2,$3)', [r.digest,r.familyId,r.used]); }
  async rotateRefreshToken({digest,newDigest,newAccessDigest,now,accessExpiresAt}) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT family_id AS "familyId",used FROM afx_refresh_tokens WHERE digest=$1 FOR UPDATE', [digest]);
      if (!rows[0]) throw new Error('invalid_refresh_token');
      const { rows: families } = await client.query('SELECT id,current_digest AS "currentDigest",revoked,expires_at AS "expiresAt" FROM afx_refresh_families WHERE id=$1 FOR UPDATE', [rows[0].familyId]);
      const family = families[0];
      if (!family || family.revoked || rows[0].used || family.currentDigest !== digest || new Date(family.expiresAt).getTime() <= now) throw new Error('refresh_reuse_detected');
      await client.query('UPDATE afx_refresh_tokens SET used=true WHERE digest=$1', [digest]);
      await client.query('INSERT INTO afx_refresh_tokens(digest,family_id,used) VALUES($1,$2,false)', [newDigest,family.id]);
      await client.query('UPDATE afx_refresh_families SET current_digest=$1,version=version+1 WHERE id=$2', [newDigest,family.id]);
      await client.query('UPDATE afx_sessions SET access_digest=$1,access_expires_at=to_timestamp($2/1000.0) WHERE family_id=$3 AND revoked=false', [newAccessDigest,accessExpiresAt,family.id]);
      await client.query('COMMIT');
      return family;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async revokeRefreshFamily(familyId) { await this.pool.query('UPDATE afx_refresh_families SET revoked=true WHERE id=$1', [familyId]); await this.pool.query('UPDATE afx_sessions SET revoked=true WHERE family_id=$1', [familyId]); }
  async revokeSession(sessionId) { await this.pool.query('UPDATE afx_sessions SET revoked=true WHERE id=$1', [sessionId]); }
  async revokeUserSessions(userId) { await this.pool.query('UPDATE afx_sessions SET revoked=true WHERE user_id=$1', [userId]); await this.pool.query('UPDATE afx_refresh_families SET revoked=true WHERE user_id=$1', [userId]); }
  async createRecoveryToken(r) { await this.pool.query('UPDATE afx_recovery_tokens SET used=true WHERE user_id=$1 AND used=false', [r.userId]); await this.pool.query('INSERT INTO afx_recovery_tokens(digest,user_id,expires_at,used) VALUES($1,$2,to_timestamp($3/1000.0),false)', [r.digest,r.userId,r.expiresAt]); }
  async consumeRecoveryToken(digest, now) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT digest,user_id AS "userId",EXTRACT(EPOCH FROM expires_at)*1000 AS "expiresAt",used FROM afx_recovery_tokens WHERE digest=$1 FOR UPDATE', [digest]);
      const token = rows[0] ? {...rows[0], expiresAt:Number(rows[0].expiresAt)} : null;
      if (!token || token.used || token.expiresAt <= now) throw new Error('invalid_recovery_token');
      await client.query('UPDATE afx_recovery_tokens SET used=true WHERE digest=$1', [digest]);
      await client.query('COMMIT');
      return token;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async appendSecurityAudit(event) {
    assertAuditMetadataSafe(event.metadata);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT integrity_hash AS "integrityHash" FROM afx_security_audit_events ORDER BY occurred_at DESC, created_at DESC LIMIT 1 FOR SHARE');
      const previousHash = rows[0]?.integrityHash ?? '';
      const record = { ...event, integrityPrevHash: previousHash };
      const integrityHash = auditHash(event, previousHash);
      await client.query(`INSERT INTO afx_security_audit_events
        (id,event_type,outcome,actor_user_id,tenant_id,session_id,request_id,workload_subject,ip_hash,user_agent_hash,metadata,integrity_prev_hash,integrity_hash,retention_until)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,to_timestamp($14/1000.0))`,
        [record.id,record.eventType,record.outcome,record.actorUserId ?? null,record.tenantId ?? null,record.sessionId ?? null,record.requestId ?? null,record.workloadSubject ?? null,record.ipHash ?? null,record.userAgentHash ?? null,JSON.stringify(record.metadata ?? {}),previousHash,integrityHash,record.retentionUntil ?? Date.now()]);
      await client.query('COMMIT');
      return { ...record, integrityHash };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async listSecurityAudit({ tenantId, limit = 100 } = {}) {
    const params = tenantId ? [tenantId, Math.min(limit, 1000)] : [Math.min(limit, 1000)];
    const where = tenantId ? 'WHERE tenant_id=$1' : '';
    const { rows } = await this.pool.query(`SELECT id,occurred_at AS "occurredAt",event_type AS "eventType",outcome,actor_user_id AS "actorUserId",tenant_id AS "tenantId",session_id AS "sessionId",request_id AS "requestId",workload_subject AS "workloadSubject",metadata,integrity_prev_hash AS "integrityPrevHash",integrity_hash AS "integrityHash",retention_until AS "retentionUntil" FROM afx_security_audit_events ${where} ORDER BY occurred_at DESC LIMIT $${params.length}`, params);
    return rows;
  }
  async purgeExpiredAudit(now = Date.now()) { const { rowCount } = await this.pool.query('DELETE FROM afx_security_audit_events WHERE retention_until IS NOT NULL AND retention_until <= to_timestamp($1/1000.0)', [now]); return rowCount; }
}
