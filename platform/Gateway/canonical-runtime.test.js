import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PersistentAfxCore } from '../../core/AFX-CORE/src/persistent-core.js';
import { PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';
import { createCanonicalRuntime, createServer } from './server.js';
import { readFile } from 'node:fs/promises';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Canonical Runtime Gate requires DATABASE_URL');

const seedPool = new Pool({ connectionString: databaseUrl, max: 5 });
const seedRepository = new PostgresAfxCoreRepository(seedPool);
const seedCore = new PersistentAfxCore({ repository: seedRepository });
const email = `runtime-gate-${Date.now()}@example.com`;
const password = 'Correct Horse Battery Staple!';
const tenantId = `tenant-runtime-${Date.now()}`;

let runtime;
let server;
let base;

async function startRuntime() {
  runtime = createCanonicalRuntime({ databaseUrl });
  server = createServer({ runtime }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}

async function stopRuntime() {
  if (server) await new Promise(resolve => server.close(resolve));
  server = null;
  base = null;
  if (runtime) await runtime.close();
  runtime = null;
}

before(async () => {
  await seedRepository.migrate();
  const user = await seedCore.createUser({ email, password });
  await seedCore.addMembership({ userId: user.id, tenantId, roles: ['user'] });
  await startRuntime();
});

after(async () => {
  await stopRuntime();
  await seedPool.end();
});

test('canonical login returns 200 and is backed by PersistentAfxCore', async () => {
  const response = await fetch(`${base}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.authenticated, true);
  assert.match(body.accessToken, /^[A-Za-z0-9_-]{40,}$/);
  assert.match(body.refreshToken, /^[A-Za-z0-9_-]{40,}$/);
});

test('canonical context gives 401 without credentials and 403 for the wrong tenant', async () => {
  const unauthenticated = await fetch(`${base}/v1/auth/context`);
  assert.equal(unauthenticated.status, 401);

  const login = await fetch(`${base}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  const tokens = await login.json();

  const forbidden = await fetch(`${base}/v1/auth/context`, {
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      'X-AFX-Tenant-Id': 'tenant-not-owned',
    },
  });
  assert.equal(forbidden.status, 403);

  const allowed = await fetch(`${base}/v1/auth/context`, {
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      'X-AFX-Tenant-Id': tenantId,
    },
  });
  assert.equal(allowed.status, 200);
  const context = await allowed.json();
  assert.equal(context.tenantId, tenantId);
});

test('state survives complete gateway process recreation', async () => {
  const login = await fetch(`${base}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  const tokens = await login.json();

  await stopRuntime();
  await startRuntime();

  const response = await fetch(`${base}/v1/auth/context`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  assert.equal(response.status, 200);
});

test('refresh rotates token and rejects reuse of the old refresh token', async () => {
  const login = await fetch(`${base}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  const first = await login.json();

  const rotated = await fetch(`${base}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: first.refreshToken }),
  });
  assert.equal(rotated.status, 200);
  const second = await rotated.json();
  assert.notEqual(second.refreshToken, first.refreshToken);

  const reused = await fetch(`${base}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: first.refreshToken }),
  });
  assert.equal(reused.status, 401);
});

test('concurrent refresh produces exactly one successful successor', async () => {
  const login = await fetch(`${base}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  const first = await login.json();

  const results = await Promise.all([
    fetch(`${base}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: first.refreshToken }),
    }),
    fetch(`${base}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: first.refreshToken }),
    }),
  ]);
  const statuses = results.map(response => response.status).sort((a, b) => a - b);
  assert.deepEqual(statuses, [200, 401]);
});

test('Experience server is presentation-only and cannot expose local authentication APIs', async () => {
  const source = await readFile(new URL('../../experience/web/server.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /new\s+AfxCore\s*\(/);
  assert.doesNotMatch(source, /from ['"]\.\.\/\.\.\/core\/AFX-CORE\/src\/core\.js['"]/);
  assert.match(source, /canonical_api_only/);
});
