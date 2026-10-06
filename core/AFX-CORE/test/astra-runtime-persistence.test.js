import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';
import { PersistentAfxCore } from '../src/persistent-core.js';
import { createAstraGatewayRoute } from '../../../.ai/astra/gateway-route.mjs';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

async function setup(pool) {
  const repository = new PostgresAfxCoreRepository(pool);
  await repository.migrate();
  const core = new PersistentAfxCore({
    repository,
    audit: event => repository.appendAuditEvent(event)
  });
  const user = await core.createUser({
    email: `astra-pg-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    password: 'Correct Horse Battery Staple!'
  });
  await core.addMembership({ userId: user.id, tenantId: 'tenant-a', roles: ['agent-admin'] });
  await core.grantRolePermission('agent-admin', 'agent.execute');
  const tokens = await core.authenticatePassword({
    email: user.email,
    password: 'Correct Horse Battery Staple!',
    tenantId: 'tenant-a'
  });
  return { repository, core, user, tokens };
}

test('real PostgreSQL runtime atomically persists Astra evidence and audit', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const { repository, core, user, tokens } = await setup(pool);
    const route = createAstraGatewayRoute({
      core,
      audit: event => repository.appendAuditEvent(event),
      persistExecution: execution => repository.appendAstraExecutionAtomic(execution)
    });

    const response = {};
    await route(
      { method: 'POST', headers: { authorization: `Bearer ${tokens.accessToken}` } },
      {},
      {
        requestId: `pg-atomic-${Date.now()}`,
        sendJson: (_res, status, body) => { response.status = status; response.body = body; }
      }
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'RUNTIME_VALIDATED');
    assert.equal(response.body.providerMode, '<MOCK>');
    assert.equal(response.body.tenantId, 'tenant-a');

    const { rows: evidence } = await pool.query(
      'SELECT run_id,model,evidence_status,evidence_hash FROM afx_ai_evidence WHERE run_id=$1',
      [response.body.requestId]
    );
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].model, 'gpt-6-astra');
    assert.equal(evidence[0].evidence_status, 'RUNTIME_VALIDATED');
    assert.equal(evidence[0].evidence_hash, response.body.evidenceHash);

    const { rows: audits } = await pool.query(
      'SELECT event_type,request_id,tenant_id,user_id,decision,payload FROM afx_audit_events WHERE request_id=$1 ORDER BY id DESC',
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

test('atomic persistence failure rolls back evidence, denies success, and records failure audit', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const { repository, core, tokens } = await setup(pool);
    await pool.query(`
      CREATE OR REPLACE FUNCTION afx_test_fail_astra_audit() RETURNS trigger AS $$
      BEGIN
        IF NEW.event_type = 'ai.astra.executed' THEN
          RAISE EXCEPTION 'forced_atomic_audit_failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS afx_test_fail_astra_audit_trigger ON afx_audit_events;
      CREATE TRIGGER afx_test_fail_astra_audit_trigger
      BEFORE INSERT ON afx_audit_events
      FOR EACH ROW EXECUTE FUNCTION afx_test_fail_astra_audit();
    `);

    const route = createAstraGatewayRoute({
      core,
      audit: event => repository.appendAuditEvent(event),
      persistExecution: execution => repository.appendAstraExecutionAtomic(execution)
    });

    const response = {};
    const requestId = `pg-rollback-${Date.now()}`;
    await route(
      { method: 'POST', headers: { authorization: `Bearer ${tokens.accessToken}` } },
      {},
      {
        requestId,
        sendJson: (_res, status, body) => { response.status = status; response.body = body; }
      }
    );

    await pool.query('DROP TRIGGER IF EXISTS afx_test_fail_astra_audit_trigger ON afx_audit_events');
    await pool.query('DROP FUNCTION IF EXISTS afx_test_fail_astra_audit()');

    assert.equal(response.status, 503);
    assert.equal(response.body.status, 'DENY');
    assert.equal(response.body.productionSuccess, false);
    assert.equal(response.body.evidenceStatus, 'NOT_PROVEN');

    const { rows: evidence } = await pool.query(
      'SELECT id FROM afx_ai_evidence WHERE run_id=$1',
      [requestId]
    );
    assert.equal(evidence.length, 0);

    const { rows: failures } = await pool.query(
      'SELECT event_type,decision,reason FROM afx_audit_events WHERE request_id=$1',
      [requestId]
    );
    assert.equal(failures.length, 1);
    assert.equal(failures[0].event_type, 'ai.astra.persistence_failed');
    assert.equal(failures[0].decision, 'DENY');
    assert.equal(failures[0].reason, 'atomic_evidence_audit_persistence_failed');
  } finally {
    await pool.query('DROP TRIGGER IF EXISTS afx_test_fail_astra_audit_trigger ON afx_audit_events').catch(() => {});
    await pool.query('DROP FUNCTION IF EXISTS afx_test_fail_astra_audit()').catch(() => {});
    await pool.end();
  }
});
