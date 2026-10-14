import test from 'node:test';
import assert from 'node:assert/strict';
import { AfxCore } from '../../core/AFX-CORE/src/core.js';
import { createAstraGatewayRoute } from '../../.ai/astra/gateway-route.mjs';

async function invoke(route, { token, prompt = "inspect AFAGHX architecture" } = {}) {
  const response = {};
  const req = {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: prompt === null ? {} : { prompt }
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
  const evidenceRecords = [];
  const core = new AfxCore();
  const user = core.createUser({ email: `astra-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['agent-admin'] });
  core.grantRolePermission('agent-admin', 'agent.execute');
  const tokens = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  const route = createAstraGatewayRoute({
    core,
    audit: async event => events.push(event),
    persistEvidence: async evidence => { evidenceRecords.push(evidence); return { id: 'evidence-1' }; }
  });

  const response = await invoke(route, { token: tokens.accessToken });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.chain, [
    'GATEWAY','AFX-CORE','SECURITY_CONTEXT','CORE_POLICY','TOOL_BOUNDARY',
    'ASTRA_ROUTER','MOCK_PROVIDER','EVIDENCE','AUDIT'
  ]);
  assert.equal(response.body.providerMode, '<MOCK>');
  assert.equal(response.body.status, 'LOCAL_VALIDATED');
  assert.equal(response.body.result.inputAccepted, true);
  assert.equal(response.body.result.result, 'MOCK_ONLY: the request was accepted, but no real model inference was performed.');
  assert.equal(response.body.evidenceStatus, 'LOCAL_VALIDATED');
  assert.equal(response.body.tenantId, 'tenant-a');
  assert.equal(events.at(-1).type, 'ai.astra.executed');
  assert.equal(events.at(-1).decision, 'ALLOW');
  assert.equal(evidenceRecords.length, 1);
  assert.equal(evidenceRecords[0].test_results, null);
});

test('Gateway rejects missing authentication before Core policy', async () => {
  const events = [];
  const core = new AfxCore();
  const route = createAstraGatewayRoute({ core, audit: async event => events.push(event) });
  const response = await invoke(route);
  assert.equal(response.status, 401);
  assert.equal(events.at(-1).reason, 'missing_or_invalid_bearer_token');
});

test('Gateway rejects a missing prompt instead of silently running a fixed action', async () => {
  const core = new AfxCore();
  const user = core.createUser({ email: `missing-prompt-${Date.now()}@example.com`, password: 'Correct Horse Battery Staple!' });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['agent-admin'] });
  core.grantRolePermission('agent-admin', 'agent.execute');
  const tokens = core.authenticatePassword({ email: user.email, password: 'Correct Horse Battery Staple!', tenantId: 'tenant-a' });
  const events = [];
  const route = createAstraGatewayRoute({ core, audit: async event => events.push(event) });
  const response = await invoke(route, { token: tokens.accessToken, prompt: '' });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'prompt_required');
  assert.equal(events.at(-1).type, 'ai.astra.invalid_request');
  assert.equal(events.at(-1).decision, 'DENY');
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


test('Gateway refuses RUNTIME_VALIDATED when atomic persistence does not return evidence and audit records', async () => {
  const events = [];
  const core = new AfxCore();
  const user = core.createUser({
    email: `astra-persist-deny-${Date.now()}@example.com`,
    password: 'Correct Horse Battery Staple!'
  });
  core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['agent-admin'] });
  core.grantRolePermission('agent-admin', 'agent.execute');
  const tokens = core.authenticatePassword({
    email: user.email,
    password: 'Correct Horse Battery Staple!',
    tenantId: 'tenant-a'
  });
  const route = createAstraGatewayRoute({
    core,
    audit: async event => events.push(event),
    persistExecution: async () => ({})
  });

  const response = await invoke(route, { token: tokens.accessToken });
  assert.equal(response.status, 503);
  assert.equal(response.body.status, 'DENY');
  assert.equal(response.body.evidenceStatus, 'NOT_PROVEN');
  assert.equal(response.body.productionSuccess, false);
  assert.equal(events.at(-1).type, 'ai.astra.persistence_failed');
  assert.equal(events.at(-1).decision, 'DENY');
});

