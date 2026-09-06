import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('G01 authentication state creation is atomic on persistence failure', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  const core = new PersistentAfxCore({ repository });

  const user = await core.createUser({
    email: `atomic-${Date.now()}@example.com`,
    password: 'Correct Horse Battery Staple!',
  });
  const organization = await core.createOrganization({
    name: 'Atomic Test Organization',
    slug: `atomic-org-${Date.now()}`,
  });
  const tenant = await core.createTenant({
    organizationId: organization.id,
    name: 'Atomic Test Tenant',
    slug: `atomic-tenant-${Date.now()}`,
  });

  const sessionId = `ses_atomic_${Date.now()}`;
  const familyId = `rtf_atomic_${Date.now()}`;
  const accessDigest = `access_digest_atomic_${Date.now()}`;
  const refreshDigest = `refresh_digest_atomic_${Date.now()}`;

  const originalConnect = pool.connect.bind(pool);
  pool.connect = async () => {
    const client = await originalConnect();
    const originalQuery = client.query.bind(client);
    let refreshTokenInsertReached = false;
    client.query = async (...args) => {
      const sql = typeof args[0] === 'string' ? args[0] : args[0]?.text ?? '';
      if (sql.includes('INSERT INTO afx_refresh_tokens')) {
        refreshTokenInsertReached = true;
        throw new Error('injected_authentication_persistence_failure');
      }
      if (sql === 'ROLLBACK' && !refreshTokenInsertReached) {
        return originalQuery(...args);
      }
      return originalQuery(...args);
    };
    return client;
  };

  await assert.rejects(
    repository.createAuthenticationState({
      session: {
        id: sessionId,
        userId: user.id,
        tenantId: tenant.id,
        familyId,
        accessDigest,
        accessExpiresAt: Date.now() + 60_000,
      },
      refreshFamily: {
        id: familyId,
        userId: user.id,
        tenantId: tenant.id,
        currentDigest: refreshDigest,
        expiresAt: Date.now() + 3_600_000,
        revoked: false,
      },
      refreshToken: {
        digest: refreshDigest,
        familyId,
        used: false,
      },
    }),
    /injected_authentication_persistence_failure/,
  );

  const { rows: sessions } = await pool.query('SELECT id FROM afx_sessions WHERE id=$1', [sessionId]);
  const { rows: families } = await pool.query('SELECT id FROM afx_refresh_families WHERE id=$1', [familyId]);
  const { rows: tokens } = await pool.query('SELECT digest FROM afx_refresh_tokens WHERE digest=$1', [refreshDigest]);

  assert.equal(sessions.length, 0);
  assert.equal(families.length, 0);
  assert.equal(tokens.length, 0);

  await pool.end();
});
