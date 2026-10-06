import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEvidenceAcquisition,failClosedEvidenceAcquisition} from './evidence-acquisition.mjs';

const valid={provider:'gpt-6-astra',providerHealthStatus:'HEALTHY',providerHealthAt:'2026-10-06T19:00:00Z',providerHealthEvidenceRef:'health:run-001',apiCreditConfirmed:true,apiCreditEvidenceRef:'credit:provider-account-001',secretStoreReady:true,secretReference:'secret-store:astra-prod-ref'};

test('real-evidence intake requires all three external prerequisites',()=>{const r=validateEvidenceAcquisition(valid);assert.equal(r.status,'ELIGIBLE_FOR_LIVE_PREFLIGHT');});
test('mock provider can never enter live preflight',()=>assert.equal(failClosedEvidenceAcquisition({...valid,provider:'<MOCK>'}).ok,false));
test('credit without evidence reference is denied',()=>assert.equal(failClosedEvidenceAcquisition({...valid,apiCreditEvidenceRef:''}).ok,false));
test('secret values are rejected from evidence references',()=>assert.equal(failClosedEvidenceAcquisition({...valid,secretReference:'api-key=super-secret'}).ok,false));
test('provider health must be real and timestamped',()=>assert.equal(failClosedEvidenceAcquisition({...valid,providerHealthStatus:'UNKNOWN'}).ok,false));
test('missing secret store fails closed',()=>assert.equal(failClosedEvidenceAcquisition({...valid,secretStoreReady:false}).status,'DENY'));
