const text=v=>typeof v==='string'&&v.trim().length>0;
const iso=v=>typeof v==='string'&&!Number.isNaN(Date.parse(v));
const REF=/^[a-z][a-z0-9-]{1,31}:[A-Za-z0-9._:/-]{1,220}$/;

function validateRef(name,value){
  if(!text(value)||value.length>256||!REF.test(value)) throw new Error(name+'_evidence_ref_invalid');
  if(/[\r\n\u0000]/.test(value)) throw new Error(name+'_evidence_ref_invalid');
  if(/(?:api[_-]?key|bearer|password|token)\s*[=:]/i.test(value)) throw new Error(name+'_evidence_ref_must_not_contain_secret_material');
}

function buildCandidate(input={}){
  if(input.provider==='<MOCK>'||!text(input.provider)) throw new Error('live_provider_required');
  if(input.providerHealthStatus!=='HEALTHY') throw new Error('provider_health_not_verified');
  if(!iso(input.providerHealthAt)) throw new Error('provider_health_timestamp_required');
  validateRef('provider_health',input.providerHealthEvidenceRef);
  if(input.apiCreditConfirmed!==true) throw new Error('api_credit_not_confirmed');
  validateRef('api_credit',input.apiCreditEvidenceRef);
  if(input.secretStoreReady!==true) throw new Error('secret_store_not_ready');
  validateRef('secret',input.secretReference);
  return Object.freeze({
    provider:input.provider,
    providerHealth:Object.freeze({status:'HEALTHY',at:input.providerHealthAt,evidenceRef:input.providerHealthEvidenceRef}),
    apiCredit:Object.freeze({confirmed:true,evidenceRef:input.apiCreditEvidenceRef}),
    secretStore:Object.freeze({ready:true,reference:input.secretReference})
  });
}

export function validateEvidenceAcquisition(input={},options={}){
  if(typeof options.verifyEvidence!=='function') throw new Error('evidence_verifier_required');
  const candidate=buildCandidate(input);
  const verification=options.verifyEvidence(candidate);
  if(!verification||verification.verified!==true||!text(verification.verificationRef)) throw new Error('external_evidence_verification_failed');
  validateRef('verification',verification.verificationRef);
  return Object.freeze({
    ...candidate,
    verification:Object.freeze({verified:true,evidenceRef:verification.verificationRef}),
    capturedAt:new Date().toISOString(),
    status:'VERIFIED_FOR_LIVE_PREFLIGHT'
  });
}

export function failClosedEvidenceAcquisition(input={},options={}){
  try{return {ok:true,evidence:validateEvidenceAcquisition(input,options)};}
  catch(error){return {ok:false,status:'DENY',reason:error.message};}
}
