import test from 'node:test';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

async function createTestCore(pool) {
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  return new PersistentAfxCore({ repository });
}

test('postgres persistence survives service object recreation', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const core1 = await createTestCore(pool);
    const user = await core1.createUser({ email: `persist-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
    await core1.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });
    await core1.grantRolePermission('admin', 'invoice.read');
    const tokens = await core1.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });

    const repository = new PostgresAfxCoreRepository(pool);
    const core2 = new PersistentAfxCore({ repository });
    const context = await core2.authenticateAccessToken(tokens.accessToken);
    assert.equal(context.userId, user.id);
    assert.equal(await core2.authorize(context, 'invoice.read', 'tenant-a'), true);
  } finally {
    await pool.end();
  }
});

test('persistent session revocation also revokes its refresh family', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const core = await createTestCore(pool);
    const user = await core.createUser({ email: `revoke-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-a' });
    const tokens = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });

    await core.revokeSession(tokens.sessionId);
    await assert.rejects(() => core.authenticateAccessToken(tokens.accessToken), /unauthorized/);
    await assert.rejects(() => core.refresh(tokens.refreshToken), /refresh_reuse_detected|invalid_refresh_token/);
  } finally {
    await pool.end();
  }
});

test('concurrent refresh allows exactly one winner', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  try {
    const core = await createTestCore(pool);
    const user = await core.createUser({ email: `race-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-a' });
    const tokens = await core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
    const results = await Promise.allSettled([
      core.refresh(tokens.refreshToken),
      core.refresh(tokens.refreshToken),
    ]);
    const fulfilled = results.filter(x => x.status === 'fulfilled');
    const rejected = results.filter(x => x.status === 'rejected');
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.match(rejected[0].reason.message, /refresh_reuse_detected|invalid_refresh_token/);
  } finally {
    await pool.end();
  }
});


test('migration is idempotent and records canonical schema version', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const repository = new PostgresAfxCoreRepository(pool);
    await repository.migrate();
    await repository.migrate();
    const { rows } = await pool.query('SELECT version FROM afx_schema_migrations ORDER BY version');
    assert.deepEqual(rows.map(row => row.version), ['001_initial']);
  } finally {
    await pool.end();
  }
});


test('concurrent cold-start migrations serialize and apply one canonical schema version', { skip: !databaseUrl }, async () => {
  const admin = new Pool({ connectionString: databaseUrl });
  const schema = 'afx_migration_race_' + randomUUID().replaceAll('-', '');
  const pools = [];
  let schemaCreated = false;

  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    for (let index = 0; index < 4; index++) {
      pools.push(new Pool({
        connectionString: databaseUrl,
        options: `-c search_path=${schema}`,
        max: 1
      }));
    }

    await Promise.all(pools.map(pool => new PostgresAfxCoreRepository(pool).migrate()));

    const { rows: versions } = await admin.query(`SELECT version FROM "${schema}".afx_schema_migrations ORDER BY version`);
    assert.deepEqual(versions.map(row => row.version), ['001_initial']);

    const { rows: tables } = await admin.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema=$1 ORDER BY table_name',
      [schema]
    );
    assert.deepEqual(tables.map(row => row.table_name), [
      'afx_memberships',
      'afx_refresh_families',
      'afx_refresh_tokens',
      'afx_role_permissions',
      'afx_schema_migrations',
      'afx_sessions',
      'afx_users'
    ]);
  } finally {
    await Promise.allSettled(pools.map(pool => pool.end()));
    try {
      if (schemaCreated) await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await admin.end();
    }
  }
});
