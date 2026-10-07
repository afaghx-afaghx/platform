const text=v=>typeof v==='string'&&v.trim().length>0;
const iso=v=>typeof v==='string'&&!Number.isNaN(Date.parse(v));
const REF=/^[a-z][a-z0-9-]{1,31}:[A-Za-z0-9._:/-]{1,220}$/;

function validateRef(name,value){
  if(!text(value)||value.length>256||!REF.test(value)) throw new Error(name+'_evidence_ref_invalid');
  if(/[\r\n\u0000]/.test(value)) throw new Error(name+'_evidence_ref_invalid');
  if(/(?:api[_-]?key|bearer|password|token)\s*[=:]/i.test(value)) throw new Error(name+'_evidence_ref_must_not_contain_secret_material');
}

export function validateEvidenceAcquisition(input={}){
  if(input.provider==='<MOCK>'||!text(input.provider)) throw new Error('live_provider_required');
  if(!text(input.providerHealthStatus)||input.providerHealthStatus!=='HEALTHY') throw new Error('provider_health_not_verified');
  if(!iso(input.providerHealthAt)) throw new Error('provider_health_timestamp_required');
  validateRef('provider_health',input.providerHealthEvidenceRef);
  if(input.apiCreditConfirmed!==true) throw new Error('api_credit_not_confirmed');
  validateRef('api_credit',input.apiCreditEvidenceRef);
  if(input.secretStoreReady!==true) throw new Error('secret_store_not_ready');
  validateRef('secret',input.secretReference);
  return Object.freeze({
    provider:input.provider,
    capturedAt:new Date().toISOString(),
    providerHealth:{status:'HEALTHY',at:input.providerHealthAt,evidenceRef:input.providerHealthEvidenceRef},
    apiCredit:{confirmed:true,evidenceRef:input.apiCreditEvidenceRef},
    secretStore:{ready:true,reference:input.secretReference},
    status:'ELIGIBLE_FOR_LIVE_PREFLIGHT'
  });
}

export function failClosedEvidenceAcquisition(input={}){
  try{return {ok:true,evidence:validateEvidenceAcquisition(input)};}
  catch(error){return {ok:false,status:'DENY',reason:error.message};}
}
