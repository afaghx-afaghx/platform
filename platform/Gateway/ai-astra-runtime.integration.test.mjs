import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AfxCore } from '../../core/AFX-CORE/src/core.js';
import { createCanonicalRuntime } from './runtime.mjs';

function request(base, path, { token, method='POST' } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(new URL(path, base), {
      method,
      headers: { connection: 'close', ...(token ? { authorization: `Bearer ${token}` } : {}) }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('real Gateway -> AFX-CORE -> SecurityContext -> Astra controlled path', async () => {
  const events = [];
  const core = new AfxCore();
  const user = core.createUser({ email: `astra-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['agent-admin'] });
  core.grantRolePermission('agent-admin', 'agent.execute');
  const tokens = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });

  const runtime = createCanonicalRuntime({ core, audit: async event => events.push(event) });
  const server = runtime.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const response = await request(base, '/v1/ai/astra/execute', { token: tokens.accessToken });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.chain, [
      'GATEWAY','AFX-CORE','SECURITY_CONTEXT','CORE_POLICY','TOOL_BOUNDARY',
      'ASTRA_ROUTER','MOCK_PROVIDER','EVIDENCE','AUDIT'
    ]);
    assert.equal(response.body.providerMode, '<MOCK>');
    assert.equal(response.body.evidenceStatus, 'RUNTIME_VALIDATED');
    assert.equal(response.body.tenantId, 'tenant-a');
    assert.equal(events.at(-1).type, 'ai.astra.executed');
    assert.equal(events.at(-1).decision, 'ALLOW');
  } finally {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  }
});

test('Astra path rejects missing authentication before Core policy', async () => {
  const events = [];
  const core = new AfxCore();
  const runtime = createCanonicalRuntime({ core, audit: async event => events.push(event) });
  const server = runtime.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await request(base, '/v1/ai/astra/execute');
    assert.equal(response.status, 401);
    assert.equal(events.at(-1).reason, 'missing_or_invalid_bearer_token');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Astra path rejects Core policy denial', async () => {
  const core = new AfxCore();
  const user = core.createUser({ email: `deny-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['viewer'] });
  const tokens = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  const runtime = createCanonicalRuntime({ core });
  const server = runtime.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await request(base, '/v1/ai/astra/execute', { token: tokens.accessToken });
    assert.equal(response.status, 403);
    assert.equal(response.body.error, 'ai_policy_denied');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
