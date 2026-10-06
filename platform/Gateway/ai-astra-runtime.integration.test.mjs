import test from 'node:test';
import assert from 'node:assert/strict';
import { AfxCore } from '../../core/AFX-CORE/src/core.js';
import { createAstraGatewayRoute } from '../../.ai/astra/gateway-route.mjs';

async function invoke(route, { token } = {}) {
  const response = {};
  const req = {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {}
  };
  const res = {};
  await route(req, res, {
    requestId: `req-${Date.now()}-${Math.random()}`,
    sendJson: (_res, status, body) => {
      response.status = status;
      response.body = body;
    }
  });
  return response;
}

test('Gateway -> AFX-CORE -> SecurityContext -> Astra controlled path', async () => {
  const events = [];
  const core = new AfxCore();
  const user = core.createUser({ email: `astra-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['agent-admin'] });
  core.grantRolePermission('agent-admin', 'agent.execute');
  const tokens = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  const route = createAstraGatewayRoute({ core, audit: async event => events.push(event) });

  const response = await invoke(route, { token: tokens.accessToken });
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
});

test('Gateway rejects missing authentication before Core policy', async () => {
  const events = [];
  const core = new AfxCore();
  const route = createAstraGatewayRoute({ core, audit: async event => events.push(event) });
  const response = await invoke(route);
  assert.equal(response.status, 401);
  assert.equal(events.at(-1).reason, 'missing_or_invalid_bearer_token');
});

test('Gateway rejects Core policy denial', async () => {
  const core = new AfxCore();
  const user = core.createUser({ email: `deny-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['viewer'] });
  const tokens = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  const route = createAstraGatewayRoute({ core });
  const response = await invoke(route, { token: tokens.accessToken });
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'ai_policy_denied');
});
