import test from 'node:test';
import assert from 'node:assert/strict';
import { AfxCore } from '../src/core.js';
import { hashPassword, verifyPassword } from '../src/security.js';

async function setup() {
  const events = [];
  const core = new AfxCore({ audit: event => events.push(event) });
  const user = await core.createUser({ email: 'Admin@Example.com', password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });
  core.grantRolePermission('admin', 'invoice.read');
  return { core, user, events };
}

test('password hashes are asynchronous, salted and never store plaintext', async () => {
  const firstPromise = hashPassword('Correct Horse Battery Staple!');
  const secondPromise = hashPassword('Correct Horse Battery Staple!');
  assert.equal(typeof firstPromise.then, 'function');
  assert.equal(typeof secondPromise.then, 'function');

  const [first, second] = await Promise.all([firstPromise, secondPromise]);
  assert.notEqual(first, second);
  assert.match(first, /^scrypt\$/);
  assert.equal(await verifyPassword('Correct Horse Battery Staple!', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
  assert.equal(await verifyPassword('Correct Horse Battery Staple!', 'scrypt$1$1$1$bad$bad'), false);
  assert.equal(await verifyPassword(null, first), false);
});

test('hashing enforces password length and upper-bound resource limits', async () => {
  await assert.rejects(hashPassword('short'), /weak_password/);
  await assert.rejects(hashPassword('x'.repeat(1025)), /password_too_long/);
});

test('multiple password hashes and verifications can execute concurrently', async () => {
  const passwords = [
    'Correct Horse Battery Staple!',
    'Different Strong Password 2026!',
    'Another Secure Password Phrase!'
  ];
  const hashes = await Promise.all(passwords.map(hashPassword));
  const matches = await Promise.all(hashes.map((hash, index) => verifyPassword(passwords[index], hash)));
  assert.deepEqual(matches, [true, true, true]);
});

test('login creates a short-lived access token and refresh family', async () => {
  const { core, user } = await setup();
  const tokens = await core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  assert.equal(typeof tokens.accessToken, 'string');
  assert.equal(typeof tokens.refreshToken, 'string');
  assert.equal(core.authenticateAccessToken(tokens.accessToken).userId, user.id);
});

test('wrong password is rejected without revealing identity state', async () => {
  const { core } = await setup();
  await assert.rejects(
    () => core.authenticatePassword({ email: 'admin@example.com', password: 'wrong password', tenantId: 'tenant-a' }),
    /invalid_credentials/
  );
  await assert.rejects(
    () => core.authenticatePassword({ email: 'missing@example.com', password: 'wrong password', tenantId: 'tenant-a' }),
    /invalid_credentials/
  );
});

test('cross-tenant authorization is denied', async () => {
  const { core } = await setup();
  const tokens = await core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  const context = core.authenticateAccessToken(tokens.accessToken);
  assert.equal(core.authorize(context, 'invoice.read', 'tenant-a'), true);
  assert.equal(core.authorize(context, 'invoice.read', 'tenant-b'), false);
});

test('authorization is deny-by-default', async () => {
  const { core } = await setup();
  const tokens = await core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  const context = core.authenticateAccessToken(tokens.accessToken);
  assert.equal(core.authorize(context, 'billing.delete', 'tenant-a'), false);
});

test('refresh tokens rotate and reuse revokes the family', async () => {
  const { core } = await setup();
  const first = await core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  const second = core.refresh(first.refreshToken);
  assert.notEqual(second.refreshToken, first.refreshToken);
  assert.throws(() => core.refresh(first.refreshToken), /refresh_reuse_detected/);
  assert.throws(() => core.authenticateAccessToken(second.accessToken), /unauthorized/);
});

test('session revocation invalidates access and refresh credentials', async () => {
  const { core } = await setup();
  const tokens = await core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  core.revokeSession(tokens.sessionId);
  assert.throws(() => core.authenticateAccessToken(tokens.accessToken), /unauthorized/);
  assert.throws(() => core.refresh(tokens.refreshToken), /refresh_reuse_detected|invalid_refresh_token/);
});

test('expired access tokens are rejected', async () => {
  let now = 0;
  const core = new AfxCore({ clock: () => now });
  const user = await core.createUser({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['admin'] });
  const tokens = await core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  now = 300_001;
  assert.throws(() => core.authenticateAccessToken(tokens.accessToken), /unauthorized/);
});

test('audit events contain identifiers but never credentials', async () => {
  const { core, events } = await setup();
  const tokens = await core.authenticatePassword({ email: 'admin@example.com', password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  core.refresh(tokens.refreshToken);
  const serialized = JSON.stringify(events);
  assert.equal(serialized.includes('Correct Horse Battery Staple!'), false);
  assert.equal(serialized.includes(tokens.accessToken), false);
  assert.equal(serialized.includes(tokens.refreshToken), false);
});
