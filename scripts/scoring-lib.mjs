import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const ROOT=process.cwd();
export const WEIGHTS_PATH=path.join(ROOT,"docs","scoring","weights.yml");
export const LOCK_PATH=path.join(ROOT,"docs","scoring","weights.lock.json");
export const EVIDENCE_DIR=path.join(ROOT,"docs","scoring","evidence");
export const HISTORY_PATH=path.join(ROOT,"docs","scoring","history","score-history.json");
export const EXPECTED_GATES=[
["G1_evidence_binding","controls","G1_evidence.json"],["G2_domain_security","controls","G2_domain.json"],
["G3_production_assurance","controls","G3_production.json"],["G4_contracts_kernel","controls","G4_contracts.json"],
["G5_core_runtime","controls","G5_core.json"],["G6_tenant","controls","G6_tenant.json"],["G7_rbac","controls","G7_rbac.json"],
["G8_policy","controls","G8_policy.json"],["G9_search","controls","G9_search.json"],["G10_persistence","controls","G10_persistence.json"],
["G11_cicd","controls","G11_cicd.json"],["G12_external_assurance","controls","G12_external.json"],
["G13_experience","runtime_proof","G13_experience.json"],["G14_final_gate","binary","G14_final.json"]];
export function canonicalize(v){if(Array.isArray(v))return v.map(canonicalize);if(v&&typeof v==="object")return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonicalize(v[k])]));return v}
export function canonicalJson(v){return JSON.stringify(canonicalize(v))}
export function sha256(v){return crypto.createHash("sha256").update(v,"utf8").digest("hex")}
export function parseWeightsYaml(content){
 const lines=content.split(/\r?\n/),gates={};let version=null,lockedAt=null,lockedBy=null,declaredSum=null,current=null;
 for(const raw of lines){const line=raw.trimEnd();if(!line.trim()||line.trimStart().startsWith("#"))continue;let m;
  if((m=line.match(/^version:\s*(.+)$/)))version=m[1].trim();
  else if((m=line.match(/^locked_at:\s*(.+)$/)))lockedAt=m[1].trim();
  else if((m=line.match(/^locked_by:\s*(.+)$/)))lockedBy=m[1].trim();
  else if((m=line.match(/^sum_weights:\s*(\d+)\s*$/)))declaredSum=Number(m[1]);
  else if((m=line.match(/^  (G\d+_[a-z0-9_]+):\s*$/))){current=m[1];gates[current]={}}
  else if(current&&(m=line.match(/^    weight:\s*(\d+)\s*$/)))gates[current].weight=Number(m[1]);
  else if(current&&(m=line.match(/^    description:\s*"([^"]*)"\s*$/)))gates[current].description=m[1];
  else if(current&&(m=line.match(/^    type:\s*(\w+)\s*$/)))gates[current].type=m[1];
 }
 if(!version||!lockedAt||!lockedBy||declaredSum===null||Object.keys(gates).length!==14)throw new Error("Invalid weights.yml structure");
 const sum=Object.values(gates).reduce((n,g)=>n+g.weight,0);
 if(declaredSum!==100)throw new Error(`Declared sum_weights must equal 100, got ${declaredSum}`);
 if(Math.abs(sum-declaredSum)>1e-9)throw new Error(`Actual weight sum ${sum} does not equal declared sum ${declaredSum}`);
 return {version,lockedAt,lockedBy,declaredSum,gates,sum};
}
export function loadWeights(){
 const content=fs.readFileSync(WEIGHTS_PATH,"utf8"),parsed=parseWeightsYaml(content),hash=sha256(content);
 if(!fs.existsSync(LOCK_PATH))throw new Error("weights.lock.json missing");
 const lock=JSON.parse(fs.readFileSync(LOCK_PATH,"utf8"));
 if(lock.version!==parsed.version||lock.sha256!==hash||Math.abs(lock.sum_weights-100)>1e-9||lock.adr!=="docs/architecture/adr/ADR-005-scoring-weight-table-v1.1.0.md")throw new Error("Weight lock verification failed");
 return {...parsed,contentHash:hash};
}
export function evidenceFiles(){return EXPECTED_GATES.map(([, ,f])=>path.join(EVIDENCE_DIR,f))}
export function readEvidence(p){return JSON.parse(fs.readFileSync(p,"utf8"))}
export function evidenceValidation(r,g,t){
 const e=[];
 if(r.schema_version!=="1.0.0")e.push("schema_version");if(r.gate!==g)e.push("gate");if(r.gate_type!==t)e.push("gate_type");
 if(!/^[0-9a-f]{40}$/.test(r.subject_sha??""))e.push("subject_sha");if(!/^\d{4}-\d{2}-\d{2}T/.test(r.generated_at??""))e.push("generated_at");
 if(!["VALID","MISSING","INVALID"].includes(r.evidence_status))e.push("evidence_status");
 if(typeof r.gate_score!=="number"||r.gate_score<0||r.gate_score>10)e.push("gate_score");
 if(t==="controls"&&r.evidence_status==="VALID"&&!r.controls)e.push("controls.required_for_valid");
 if(t==="controls"&&r.controls){const c=r.controls;for(const k of["total","done","in_progress","blocked","not_started"])if(!Number.isInteger(c[k])||c[k]<0)e.push("controls."+k);if(!e.length&&c.done+c.in_progress+c.blocked+c.not_started!==c.total)e.push("controls.sum")}
 if(t==="runtime_proof"&&r.evidence_status==="VALID"&&!r.runtime_proof)e.push("runtime_proof.required_for_valid");
 if(t==="runtime_proof"&&r.runtime_proof){const c=r.runtime_proof;for(const k of["total_surfaces","proven","partial","open"])if(!Number.isInteger(c[k])||c[k]<0)e.push("runtime_proof."+k);if(c.proven+c.partial+c.open!==c.total_surfaces)e.push("runtime_proof.sum")}
 if(t==="binary"&&(!r.binary||typeof r.binary.proven!=="boolean"))e.push("binary.proven");
 if(r.evidence_status==="MISSING"){if(r.gate_score!==0)e.push("missing_score");if(r.evidence_hash!==null)e.push("missing_hash");if(r.evidence_url!==null)e.push("missing_url")}
 else{if(!/^[0-9a-f]{64}$/.test(r.evidence_hash??""))e.push("evidence_hash");if(typeof r.evidence_url!=="string"||!/^https?:\/\//.test(r.evidence_url))e.push("evidence_url")}
 return e;
}
export function computeGateScore(r,t){
 if(r.evidence_status!=="VALID")return 0;
 if(t==="controls"){const c=r.controls;if(!c||c.total<=0)return 0;return 10*(c.done+c.in_progress*0.3)/c.total}
 if(t==="runtime_proof"){const c=r.runtime_proof;if(!c||c.total_surfaces<=0)return 0;return 10*(c.proven+c.partial*0.3)/c.total_surfaces}
 return r.binary?.proven===true?10:0;
}
export function assertEvidenceHash(r){const{evidence_hash,...rest}=r;const actual=sha256(canonicalJson(rest));if(actual!==evidence_hash)throw new Error("Evidence hash mismatch: "+r.gate);return actual}
export function fmt(n){return Number(n.toFixed(2))}
