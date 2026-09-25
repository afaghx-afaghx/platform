import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresRateLimiter } from '../postgres-rate-limit.js';

const url=process.env.DATABASE_URL;
test('PostgreSQL limiter is shared across instances', {skip: !url && 'DATABASE_URL required'}, async ()=>{
  const p1=new pg.Pool({connectionString:url}), p2=new pg.Pool({connectionString:url});
  const a=new PostgresRateLimiter(p1), b=new PostgresRateLimiter(p2);
  await a.migrate();
  const key='rate_test_'+Date.now();
  assert.equal((await a.check(key,{windowMs:60000,max:1})).allowed,true);
  assert.equal((await b.check(key,{windowMs:60000,max:1})).allowed,false);
  await p1.query('DELETE FROM afx_rate_limits WHERE key=$1',[key]);
  await p1.end(); await p2.end();
});
