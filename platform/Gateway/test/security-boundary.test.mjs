import test from 'node:test';
import assert from 'node:assert/strict';
import { createSecurityBoundary } from '../security-boundary.js';

test('security boundary rejects sync process and exposes async path', async ()=>{
  const s=createSecurityBoundary({rateLimiter:{check:async()=>({allowed:true,remaining:119})}});
  await assert.rejects(()=>Promise.resolve(s.process({headers:{},bodyBytes:0},()=>null,()=>true)),/async_security_boundary_required/);
  const r=await s.processAsync({headers:{},bodyBytes:0,ip:'x'},()=>null,()=>true);
  assert.equal(r.status,200);
  assert.equal(r.headers['x-rate-limit-remaining'],'119');
});
test('authorization is tenant scoped and permission scoped', async ()=>{
  const s=createSecurityBoundary({rateLimiter:{check:async()=>({allowed:true,remaining:1})}});
  const p={userId:'u',tenantId:'t1'};
  const allow=await s.authorizeAsync(p,{tenantId:'t1',permission:'p'},async()=>true);
  const denyTenant=await s.authorizeAsync(p,{tenantId:'t2',permission:'p'},async()=>true);
  const denyPerm=await s.authorizeAsync(p,{tenantId:'t1',permission:'p'},async()=>false);
  assert.equal(allow.ok,true); assert.equal(denyTenant.status,403); assert.equal(denyPerm.status,403);
});
