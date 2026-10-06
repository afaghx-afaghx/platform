import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';
import { PersistentAfxCore } from '../../core/AFX-CORE/src/persistent-core.js';
import { createAstraGatewayRoute } from '../../.ai/astra/gateway-route.mjs';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

test('real PostgreSQL runtime persists Astra evidence and audit', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();

  try {
    const core = new PersistentAfxCore({
      repository,
      audit: event => repository.appendAuditEvent(event)
    });

    const user = await core.createUser({
      email: `astra-pg-${Date.now()}@example.com`,
      password: 'Correct Horse Battery Staple!'
    });
    await core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['agent-admin'] });
    await core.grantRolePermission('agent-admin', 'agent.execute');

    const tokens = await core.authenticatePassword({
      email: user.email,
      password: 'Correct Horse Battery Staple!',
      tenantId: 'tenant-a'
    });

    const route = createAstraGatewayRoute({
      core,
      audit: event => repository.appendAuditEvent(event),
      persistEvidence: evidence => repository.appendEvidence(evidence)
    });

    const response = {};
    await route(
      { method: 'POST', headers: { authorization: `Bearer ${tokens.accessToken}` } },
      {},
      {
        requestId: `pg-${Date.now()}`,
        sendJson: (_res, status, body) => {
          response.status = status;
          response.body = body;
        }
      }
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'RUNTIME_VALIDATED');
    assert.equal(response.body.providerMode, '<MOCK>');
    assert.equal(response.body.tenantId, 'tenant-a');

    const { rows: evidence } = await pool.query(
      'SELECT run_id,model,capability,tool,authorization_decision,action,input_context_hash,evidence_status,evidence_hash FROM afx_ai_evidence WHERE run_id=$1',
      [response.body.requestId]
    );
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].model, 'gpt-6-astra');
    assert.equal(evidence[0].evidence_status, 'RUNTIME_VALIDATED');
    assert.equal(evidence[0].evidence_hash, response.body.evidenceHash);
    assert.notEqual(evidence[0].input_context_hash, '');

    const { rows: audits } = await pool.query(
      'SELECT event_type,request_id,tenant_id,user_id,decision,payload FROM afx_audit_events WHERE request_id=$1 ORDER BY id DESC LIMIT 1',
      [response.body.requestId]
    );
    assert.equal(audits.length, 1);
    assert.equal(audits[0].event_type, 'ai.astra.executed');
    assert.equal(audits[0].tenant_id, 'tenant-a');
    assert.equal(audits[0].user_id, user.id);
    assert.equal(audits[0].decision, 'ALLOW');
    assert.equal(audits[0].payload.evidenceHash, response.body.evidenceHash);
  } finally {
    await pool.end();
  }
});
