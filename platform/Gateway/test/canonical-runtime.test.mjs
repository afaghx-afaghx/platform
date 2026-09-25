import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanonicalRuntime } from '../../platform/Gateway/runtime.mjs';

test('canonical runtime exposes 401 for context without bearer', async ()=>{
  const runtime=createCanonicalRuntime({core:{
    authenticateAccessToken:async()=>{throw new Error('unauthorized')},
    authorize:async()=>false
  }});
  const req={method:'GET',url:'/v1/auth/context',headers:{},socket:{remoteAddress:'127.0.0.1'}};
  const chunks=[]; const res={writeHead(s,h){this.status=s;this.headers=h},end(x){chunks.push(x)}};
  await runtime.handle(req,res); assert.equal(res.status,401);
});
