import test from 'node:test';
import assert from 'node:assert/strict';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';

const pg = process.env.DATABASE_URL ? (await import('pg')) : null;
const Pool = pg?.default?.Pool;

function makeCore(pool) {
  return new PersistentAfxCore({ repository: new PostgresAfxCoreRepository(pool) });
}

test('disabled account cannot authenticate and its sessions are revoked', { skip: !process.env.DATABASE_URL }, async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const core = makeCore(pool);
  await core.migrate();
  const email = `lifecycle-${Date.now()}@example.com`;
  const user = await core.createUser({ email, password: 'Correct Horse Battery Staple!' });
  await core.addMembership({ userId: user.id, tenantId: 'tenant-a' });
  const tokens = await core.authenticatePassword({ email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  await core.setUserStatus({ userId: user.id, status: 'disabled' });
  await assert.rejects(() => core.authenticateAccessToken(tokens.accessToken), /unauthorized/);
  await assert.rejects(() => core.authenticatePassword({ email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' }), /invalid_credentials/);
  await pool.end();
});

test('password recovery token is single-use and password reset revokes existing sessions', { skip: !process.env.DATABASE_URL }, async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const core = makeCore(pool);
  await core.migrate();
  const email = `recovery-${Date.now()}@example.com`;
  const user = await core.createUser({ email, password: 'Old Password 123!' });
  await core.addMembership({ userId: user.id, tenantId: 'tenant-a' });
  const oldSession = await core.authenticatePassword({ email, password: 'Old Password 123!', tenantId: 'tenant-a' });
  const request = await core.requestPasswordRecovery({ email });
  assert.equal(request.accepted, true);
  assert.ok(request.recoveryToken);
  await core.completePasswordRecovery({ recoveryToken: request.recoveryToken, newPassword: 'New Password 456!' });
  await assert.rejects(() => core.authenticateAccessToken(oldSession.accessToken), /unauthorized/);
  const newSession = await core.authenticatePassword({ email, password: 'New Password 456!', tenantId: 'tenant-a' });
  assert.ok(newSession.accessToken);
  await assert.rejects(() => core.completePasswordRecovery({ recoveryToken: request.recoveryToken, newPassword: 'Another Password 789!' }), /invalid_recovery_token/);
  await pool.end();
});

test('password recovery response is non-enumerating for unknown accounts', { skip: !process.env.DATABASE_URL }, async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const core = makeCore(pool);
  await core.migrate();
  const existingEmail = `enumeration-${Date.now()}@example.com`;
  await core.createUser({ email: existingEmail, password: 'Correct Horse Battery Staple!' });
  const existing = await core.requestPasswordRecovery({ email: existingEmail });
  const unknown = await core.requestPasswordRecovery({ email: `unknown-${Date.now()}@example.com` });
  assert.equal(existing.accepted, unknown.accepted);
  assert.equal(existing.recoveryToken !== undefined, true);
  assert.equal(unknown.recoveryToken, undefined);
  await pool.end();
});
