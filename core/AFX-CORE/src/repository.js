import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export class AfxCoreRepository {
  async migrate() { throw new Error('not_implemented'); }
  async createUser() { throw new Error('not_implemented'); }
  async findUserByEmail() { throw new Error('not_implemented'); }
  async findUserById() { throw new Error('not_implemented'); }
  async updateUserStatus() { throw new Error('not_implemented'); }
  async createOrganization() { throw new Error('not_implemented'); }
  async findOrganizationById() { throw new Error('not_implemented'); }
  async updateOrganizationStatus() { throw new Error('not_implemented'); }
  async createTenant() { throw new Error('not_implemented'); }
  async findTenantById() { throw new Error('not_implemented'); }
  async updateTenantStatus() { throw new Error('not_implemented'); }
  async createMembership() { throw new Error('not_implemented'); }
  async findMembership() { throw new Error('not_implemented'); }
  async grantRolePermission() { throw new Error('not_implemented'); }
  async hasRolePermission() { throw new Error('not_implemented'); }
  async createSession() { throw new Error('not_implemented'); }
  async findSessionByAccessDigest() { throw new Error('not_implemented'); }
  async createRefreshFamily() { throw new Error('not_implemented'); }
  async createRefreshToken() { throw new Error('not_implemented'); }
  async getRefreshToken() { throw new Error('not_implemented'); }
  async rotateRefreshToken() { throw new Error('not_implemented'); }
  async revokeRefreshFamily() { throw new Error('not_implemented'); }
  async revokeSession() { throw new Error('not_implemented'); }
}

const MIGRATION_PATHS = [
  fileURLToPath(new URL('../migrations/001_g01_10_durable_state.sql', import.meta.url)),
  fileURLToPath(new URL('../migrations/002_g01_organization_tenant.sql', import.meta.url)),
];

export class PostgresAfxCoreRepository extends AfxCoreRepository {
  constructor(pool) { super(); this.pool = pool; }

  async migrate() {
    for (const migrationPath of MIGRATION_PATHS) {
      const migration = await readFile(migrationPath, 'utf8');
      await this.pool.query(migration);
    }
  }

  async createUser(user) {
    await this.pool.query(
      'INSERT INTO afx_identities(id,canonical_subject,email,password_hash,status) VALUES($1,$2,$3,$4,$5)',
      [user.id, user.id, user.email, user.passwordHash, user.status],
    );
  }

  async findUserByEmail(email) {
    const { rows } = await this.pool.query(
      'SELECT id,email,password_hash AS "passwordHash",status FROM afx_identities WHERE email=$1',
      [email],
    );
    return rows[0] ?? null;
  }

  async findUserById(id) {
    const { rows } = await this.pool.query(
      'SELECT id,email,password_hash AS "passwordHash",status FROM afx_identities WHERE id=$1',
      [id],
    );
    return rows[0] ?? null;
  }

  async updateUserStatus(userId, status) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT id,status FROM afx_identities WHERE id=$1 FOR UPDATE', [userId]);
      if (!rows[0]) throw new Error('identity_not_found');
      const previousStatus = rows[0].status;
      if (previousStatus !== status) {
        await client.query('UPDATE afx_identities SET status=$1,updated_at=now() WHERE id=$2', [status, userId]);
        if (status !== 'active') {
          await client.query('UPDATE afx_refresh_families SET revoked=true,version=version+1 WHERE identity_id=$1 AND revoked=false', [userId]);
          await client.query('UPDATE afx_sessions SET revoked_at=now(),updated_at=now() WHERE identity_id=$1 AND revoked_at IS NULL', [userId]);
        }
      }
      await client.query('COMMIT');
      return { previousStatus, status };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createOrganization(org) {
    await this.pool.query(
      'INSERT INTO afx_organizations(id,slug,name,status) VALUES($1,$2,$3,$4)',
      [org.id, org.slug, org.name, org.status],
    );
  }

  async findOrganizationById(id) {
    const { rows } = await this.pool.query(
      'SELECT id,slug,name,status FROM afx_organizations WHERE id=$1',
      [id],
    );
    return rows[0] ?? null;
  }

  async updateOrganizationStatus(organizationId, status) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT id,status FROM afx_organizations WHERE id=$1 FOR UPDATE', [organizationId]);
      if (!rows[0]) throw new Error('organization_not_found');
      const previousStatus = rows[0].status;
      if (previousStatus !== status) {
        await client.query('UPDATE afx_organizations SET status=$1,updated_at=now() WHERE id=$2', [status, organizationId]);
        if (status !== 'active') {
          await client.query('UPDATE afx_tenants SET status=$1,updated_at=now() WHERE organization_id=$2 AND status <> $1', [status, organizationId]);
          await client.query('UPDATE afx_refresh_families SET revoked=true,version=version+1 WHERE tenant_id IN (SELECT id FROM afx_tenants WHERE organization_id=$1) AND revoked=false', [organizationId]);
          await client.query('UPDATE afx_sessions SET revoked_at=now(),updated_at=now() WHERE tenant_id IN (SELECT id FROM afx_tenants WHERE organization_id=$1) AND revoked_at IS NULL', [organizationId]);
        }
      }
      await client.query('COMMIT');
      return { id: organizationId, previousStatus, status };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createTenant(tenant) {
    await this.pool.query(
      'INSERT INTO afx_tenants(id,organization_id,slug,name,status) VALUES($1,$2,$3,$4,$5)',
      [tenant.id, tenant.organizationId, tenant.slug, tenant.name, tenant.status],
    );
  }

  async findTenantById(id) {
    const { rows } = await this.pool.query(
      'SELECT id,organization_id AS "organizationId",slug,name,status FROM afx_tenants WHERE id=$1',
      [id],
    );
    return rows[0] ?? null;
  }

  async updateTenantStatus(tenantId, status) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT id,organization_id AS "organizationId",status FROM afx_tenants WHERE id=$1 FOR UPDATE', [tenantId]);
      if (!rows[0]) throw new Error('tenant_not_found');
      const previousStatus = rows[0].status;
      if (previousStatus !== status) {
        await client.query('UPDATE afx_tenants SET status=$1,updated_at=now() WHERE id=$2', [status, tenantId]);
        if (status !== 'active') {
          await client.query('UPDATE afx_sessions SET revoked_at=now(),updated_at=now() WHERE tenant_id=$1 AND revoked_at IS NULL', [tenantId]);
          await client.query('UPDATE afx_refresh_families SET revoked=true,version=version+1 WHERE tenant_id=$1 AND revoked=false', [tenantId]);
        }
      }
      await client.query('COMMIT');
      return { ...rows[0], previousStatus, status };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createMembership(m) {
    await this.pool.query(
      'INSERT INTO afx_memberships(id,identity_id,tenant_id,roles,status) VALUES($1,$2,$3,$4,$5) ON CONFLICT (identity_id,tenant_id) DO UPDATE SET roles=EXCLUDED.roles,status=EXCLUDED.status,updated_at=now()',
      [`mem_${m.userId}_${m.tenantId}`, m.userId, m.tenantId, JSON.stringify(m.roles), m.status],
    );
  }

  async findMembership(userId, tenantId) {
    const { rows } = await this.pool.query(
      'SELECT identity_id AS "userId",tenant_id AS "tenantId",roles,status FROM afx_memberships WHERE identity_id=$1 AND tenant_id=$2',
      [userId, tenantId],
    );
    return rows[0] ?? null;
  }

  async grantRolePermission(role, permission) {
    await this.pool.query(
      'INSERT INTO afx_role_permissions(role,permission) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [role, permission],
    );
  }

  async hasRolePermission(role, permission) {
    const { rowCount } = await this.pool.query(
      'SELECT 1 FROM afx_role_permissions WHERE role=$1 AND permission=$2',
      [role, permission],
    );
    return rowCount === 1;
  }

  async createSession(s) {
    await this.pool.query(
      'INSERT INTO afx_sessions(id,identity_id,tenant_id,refresh_family_id,access_token_digest,access_expires_at,revoked_at) VALUES($1,$2,$3,$4,$5,to_timestamp($6/1000.0),NULL)',
      [s.id, s.userId, s.tenantId, s.familyId, s.accessDigest, s.accessExpiresAt],
    );
  }

  async findSessionByAccessDigest(digest) {
    const { rows } = await this.pool.query(
      'SELECT id,identity_id AS "userId",tenant_id AS "tenantId",refresh_family_id AS "familyId",access_token_digest AS "accessDigest",EXTRACT(EPOCH FROM access_expires_at)*1000 AS "accessExpiresAt",(revoked_at IS NOT NULL) AS revoked FROM afx_sessions WHERE access_token_digest=$1',
      [digest],
    );
    return rows[0] ? { ...rows[0], accessExpiresAt: Number(rows[0].accessExpiresAt) } : null;
  }

  async createRefreshFamily(f) {
    await this.pool.query(
      'INSERT INTO afx_refresh_families(id,identity_id,tenant_id,current_digest,expires_at,revoked) VALUES($1,$2,$3,$4,to_timestamp($5/1000.0),$6)',
      [f.id, f.userId, f.tenantId, f.currentDigest, f.expiresAt, f.revoked],
    );
  }

  async createRefreshToken(r) {
    await this.pool.query(
      'INSERT INTO afx_refresh_tokens(digest,family_id,used) VALUES($1,$2,$3)',
      [r.digest, r.familyId, r.used],
    );
  }

  async getRefreshToken(digest) {
    const { rows } = await this.pool.query(
      'SELECT digest,family_id AS "familyId",used FROM afx_refresh_tokens WHERE digest=$1',
      [digest],
    );
    return rows[0] ?? null;
  }

  async rotateRefreshToken({ digest, newDigest, newAccessDigest, now, accessExpiresAt }) {
    const client = await this.pool.connect();
    let committed = false;
    try {
      await client.query('BEGIN');
      const { rows: tokens } = await client.query(
        'SELECT family_id AS "familyId",used FROM afx_refresh_tokens WHERE digest=$1 FOR UPDATE',
        [digest],
      );
      if (!tokens[0]) throw new Error('invalid_refresh_token');
      const { rows: families } = await client.query(
        'SELECT id,current_digest AS "currentDigest",revoked,EXTRACT(EPOCH FROM expires_at)*1000 AS "expiresAt",identity_id AS "userId",tenant_id AS "tenantId" FROM afx_refresh_families WHERE id=$1 FOR UPDATE',
        [tokens[0].familyId],
      );
      const family = families[0];
      if (!family || family.revoked || tokens[0].used || family.currentDigest !== digest || Number(family.expiresAt) <= now) {
        if (family) {
          await client.query('UPDATE afx_refresh_families SET revoked=true,version=version+1 WHERE id=$1', [family.id]);
          await client.query('UPDATE afx_sessions SET revoked_at=now(),updated_at=now() WHERE refresh_family_id=$1 AND revoked_at IS NULL', [family.id]);
          await client.query('COMMIT');
          committed = true;
        }
        throw new Error('refresh_reuse_detected');
      }
      await client.query('UPDATE afx_refresh_tokens SET used=true WHERE digest=$1', [digest]);
      await client.query('INSERT INTO afx_refresh_tokens(digest,family_id,used) VALUES($1,$2,false)', [newDigest, family.id]);
      await client.query('UPDATE afx_refresh_families SET current_digest=$1,version=version+1 WHERE id=$2', [newDigest, family.id]);
      await client.query('UPDATE afx_sessions SET access_token_digest=$1,access_expires_at=to_timestamp($2/1000.0),updated_at=now() WHERE refresh_family_id=$3 AND revoked_at IS NULL', [newAccessDigest, accessExpiresAt, family.id]);
      await client.query('COMMIT');
      committed = true;
      return family;
    } catch (error) {
      if (!committed) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async revokeRefreshFamily(familyId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE afx_refresh_families SET revoked=true,version=version+1 WHERE id=$1', [familyId]);
      await client.query('UPDATE afx_sessions SET revoked_at=now(),updated_at=now() WHERE refresh_family_id=$1 AND revoked_at IS NULL', [familyId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async revokeSession(sessionId) {
    await this.pool.query('UPDATE afx_sessions SET revoked_at=now(),updated_at=now() WHERE id=$1', [sessionId]);
  }
}
