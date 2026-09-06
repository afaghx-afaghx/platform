import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

async function createTenant(core, slug = `tenant-${Date.now()}-${Math.random().toString(16).slice(2)}`) {
  const organization = await core.createOrganization({ name: `Organization ${slug}`, slug: `org-${slug}` });
  return core.createTenant({ organizationId: organization.id, name: `Tenant ${slug}`, slug });
}

test('G01-10 PostgreSQL persistence survives service restart and multi-instance recreation', { skip: !databaseUrl }, async () => {
  const pool1 = new Pool({ connectionString: databaseUrl, max: 4 });
  const repository1 = new PostgresAfxCoreRepository(pool1);
  await repository1.migrate();
  const core1 = new PersistentAfxCore({ repository: repository1 });
  const user = await core1.createUser({ email: `persist-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
  const tenant = await createTenant(core1);
  await core1.addMembership({ userId: user.id, tenantId: tenant.id, roles: ['admin'] });
  await core1.grantRolePermission('admin', 'invoice.read');
  const tokens = await core1.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  await pool1.end();
  const pool2 = new Pool({ connectionString: databaseUrl, max: 4 });
  const repository2 = new PostgresAfxCoreRepository(pool2);
  const core2 = new PersistentAfxCore({ repository: repository2 });
  const context = await core2.authenticateAccessToken(tokens.accessToken);
  assert.equal(context.userId, user.id);
  assert.equal(context.tenantId, tenant.id);
  assert.equal(context.organizationId, tenant.organizationId);
  assert.equal(await core2.authorize(context, 'invoice.read', tenant.id), true);
  await pool2.end();
});

test('G01-10 persistent identity status transition revokes durable sessions and refresh families', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  const core = new PersistentAfxCore({ repository });
  const user = await core.createUser({ email: `lifecycle-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
  const tenant = await createTenant(core);
  await core.addMembership({ userId: user.id, tenantId: tenant.id, roles: ['admin'] });
  const tokens = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  const disabled = await core.changeUserStatus({ userId: user.id, status: 'disabled' });
  assert.equal(disabled.status, 'disabled');
  await assert.rejects(core.authenticateAccessToken(tokens.accessToken), /unauthorized/);
  await assert.rejects(core.refresh(tokens.refreshToken), /refresh_reuse_detected|invalid_refresh_token/);
  const { rows: sessionRows } = await pool.query('SELECT revoked_at IS NOT NULL AS revoked FROM afx_sessions WHERE identity_id=$1', [user.id]);
  assert.equal(sessionRows.length, 1);
  assert.equal(sessionRows[0].revoked, true);
  const { rows: familyRows } = await pool.query('SELECT revoked FROM afx_refresh_families WHERE identity_id=$1', [user.id]);
  assert.equal(familyRows.length, 1);
  assert.equal(familyRows[0].revoked, true);
  await pool.end();
});

test('G01-10 database transaction rollback leaves no partial state', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const table = `afx_g01_10_rollback_${Date.now()}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE TEMP TABLE ${table} (id integer PRIMARY KEY, value text)`);
    await client.query(`INSERT INTO ${table}(id,value) VALUES(1,'committed-before-failure')`);
    try {
      await client.query(`INSERT INTO ${table}(id,value) VALUES(1,'duplicate')`);
      assert.fail('duplicate insert should fail');
    } catch (error) {
      assert.equal(error.code, '23505');
    }
    await client.query('ROLLBACK');
    const { rows } = await client.query(`SELECT to_regclass('pg_temp.${table}') AS relation`);
    assert.equal(rows[0].relation, null);
  } finally {
    client.release();
    await pool.end();
  }
});

test('G01-12 concurrent refresh requests produce exactly one successor and revoke the family on reuse', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 8 });
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  const core = new PersistentAfxCore({ repository });
  const user = await core.createUser({ email: `race-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
  const tenant = await createTenant(core);
  await core.addMembership({ userId: user.id, tenantId: tenant.id, roles: ['admin'] });
  const initial = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  const results = await Promise.allSettled([core.refresh(initial.refreshToken), core.refresh(initial.refreshToken)]);
  const fulfilled = results.filter(result => result.status === 'fulfilled');
  const rejected = results.filter(result => result.status === 'rejected');
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason.message, 'refresh_reuse_detected');
  const { rows: familyRows } = await pool.query('SELECT id,current_digest AS "currentDigest",revoked FROM afx_refresh_families WHERE identity_id=$1 AND tenant_id=$2 ORDER BY created_at DESC LIMIT 1', [user.id, tenant.id]);
  assert.equal(familyRows.length, 1);
  assert.equal(familyRows[0].revoked, true);
  const { rows: tokenRows } = await pool.query('SELECT digest,used FROM afx_refresh_tokens WHERE family_id=$1 ORDER BY created_at ASC', [familyRows[0].id]);
  assert.equal(tokenRows.length, 2);
  assert.equal(tokenRows.filter(row => row.used).length, 1);
  assert.equal(tokenRows.find(row => !row.used)?.digest, familyRows[0].currentDigest);
  const { rows: sessionRows } = await pool.query('SELECT revoked_at IS NOT NULL AS revoked FROM afx_sessions WHERE refresh_family_id=$1', [familyRows[0].id]);
  assert.equal(sessionRows.length, 1);
  assert.equal(sessionRows[0].revoked, true);
  await pool.end();
});

test('G01-10 migration is idempotent and includes organization/tenant authority', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  await repository.migrate();
  const { rows } = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('afx_identities','afx_memberships','afx_organizations','afx_role_permissions','afx_sessions','afx_refresh_families','afx_refresh_tokens','afx_tenants') ORDER BY table_name");
  assert.deepEqual(rows.map(row => row.table_name), ['afx_identities', 'afx_memberships', 'afx_organizations', 'afx_refresh_families', 'afx_refresh_tokens', 'afx_role_permissions', 'afx_sessions', 'afx_tenants']);
  await pool.end();
});

test('organization and tenant lifecycle is durable and tenant suspension revokes sessions', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  const core = new PersistentAfxCore({ repository });
  const organization = await core.createOrganization({ name: 'Acme Corporation', slug: `acme-${Date.now()}` });
  const tenant = await core.createTenant({ organizationId: organization.id, name: 'Production', slug: 'production' });
  const user = await core.createUser({ email: `tenant-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
  await core.addMembership({ userId: user.id, tenantId: tenant.id, roles: ['admin'] });
  const tokens = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  const suspended = await core.changeTenantStatus({ tenantId: tenant.id, status: 'suspended' });
  assert.equal(suspended.status, 'suspended');
  assert.equal((await core.getTenant(tenant.id)).organizationId, organization.id);
  await assert.rejects(core.authenticateAccessToken(tokens.accessToken), /unauthorized/);
  await assert.rejects(core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: tenant.id }), /tenant_access_denied/);
  await pool.end();
});

test('organization suspension propagates to tenants and revokes durable sessions', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  const core = new PersistentAfxCore({ repository });
  const organization = await core.createOrganization({ name: 'Parent Organization', slug: `parent-${Date.now()}` });
  const tenant = await core.createTenant({ organizationId: organization.id, name: 'Child Tenant', slug: 'child' });
  const user = await core.createUser({ email: `org-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
  await core.addMembership({ userId: user.id, tenantId: tenant.id, roles: ['admin'] });
  const tokens = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: tenant.id });
  const suspended = await core.changeOrganizationStatus({ organizationId: organization.id, status: 'suspended' });
  assert.equal(suspended.status, 'suspended');
  assert.equal((await core.getTenant(tenant.id)).status, 'suspended');
  await assert.rejects(core.authenticateAccessToken(tokens.accessToken), /unauthorized/);
  await pool.end();
});
