import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresAfxCoreRepository } from '../src/repository.js';

const url=process.env.DATABASE_URL;
test('persistent security audit survives database round-trip', {skip: !url && 'DATABASE_URL required'}, async ()=>{
  const pool=new pg.Pool({connectionString:url});
  const repo=new PostgresAfxCoreRepository(pool);
  await repo.migrate();
  const marker='audit_test_'+Date.now();
  await repo.appendAudit({type:'auth.login.succeeded',userId:marker,tenantId:'tenant_test',metadata:{marker}});
  const {rows}=await pool.query('SELECT event_type,user_id,tenant_id,metadata FROM afx_security_audit WHERE user_id=$1 ORDER BY id DESC LIMIT 1',[marker]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].event_type,'auth.login.succeeded');
  assert.equal(rows[0].metadata.marker,marker);
  assert.equal(rows[0].metadata.password,undefined);
  assert.equal(rows[0].metadata.token,undefined);
  await pool.query('DELETE FROM afx_security_audit WHERE user_id=$1',[marker]);
  await pool.end();
});
