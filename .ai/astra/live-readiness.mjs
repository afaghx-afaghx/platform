export const ROWS=['LIVE_PROVIDER','API_CREDIT','SECRETS','PROVEN','PRODUCTION','PR_MERGE'];
const truth=v=>['1','true','yes','green','confirmed','ready'].includes(String(v??'').trim().toLowerCase());
const text=v=>typeof v==='string'&&v.trim().length>0;
export function evaluateReadiness(i={}){
 const live=text(i.provider)&&i.provider!=='<MOCK>'&&truth(i.providerHealth);
 const credit=truth(i.apiCredit)&&text(i.creditEvidence);
 const secrets=truth(i.secretStoreReady)&&text(i.secretReference)&&truth(i.providerHealth);
 const proven=live&&credit&&secrets&&truth(i.runtime)&&truth(i.costUsage)&&truth(i.rollback)&&truth(i.finalGate)&&truth(i.ci)&&truth(i.closure);
 const production=proven&&truth(i.productionEvidence);
 const merge=proven&&truth(i.ci)&&truth(i.closure);
 return {LIVE_PROVIDER:live?'GREEN':'RED',API_CREDIT:credit?'GREEN':'RED',SECRETS:secrets?'GREEN':'RED',PROVEN:proven?'GREEN':'RED',PRODUCTION:production?'GREEN':'RED',PR_MERGE:merge?'GREEN':'RED'};
}
export function assertFailClosed(s){
 if(s.PROVEN==='GREEN'&&(s.LIVE_PROVIDER!=='GREEN'||s.API_CREDIT!=='GREEN'||s.SECRETS!=='GREEN'))throw new Error('PROVEN prerequisite missing');
 if(s.PRODUCTION==='GREEN'&&s.PROVEN!=='GREEN')throw new Error('PRODUCTION requires PROVEN');
 if(s.PR_MERGE==='GREEN'&&s.PROVEN!=='GREEN')throw new Error('PR_MERGE requires PROVEN');
 return true;
}
export function fromEnv(e=process.env){return evaluateReadiness({provider:e.ASTRA_LIVE_PROVIDER,providerHealth:e.ASTRA_PROVIDER_HEALTH,apiCredit:e.ASTRA_API_CREDIT_CONFIRMED,creditEvidence:e.ASTRA_API_CREDIT_EVIDENCE_REF,secretStoreReady:e.ASTRA_SECRET_STORE_READY,secretReference:e.ASTRA_SECRET_REFERENCE,runtime:e.ASTRA_RUNTIME_VALIDATED,costUsage:e.ASTRA_COST_USAGE_EVIDENCE,rollback:e.ASTRA_ROLLBACK_EVIDENCE,finalGate:e.ASTRA_FINAL_GATE,productionEvidence:e.ASTRA_PRODUCTION_EVIDENCE,ci:e.ASTRA_CI_GREEN,closure:e.ASTRA_CLOSURE_GATE});}
if(import.meta.url===`file://${process.argv[1]}`){const s=fromEnv();assertFailClosed(s);console.log(JSON.stringify(s,null,2));}