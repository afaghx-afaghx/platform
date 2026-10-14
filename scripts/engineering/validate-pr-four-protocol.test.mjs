import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReportFromBody, validatePullRequestEvent} from './validate-pr-four-protocol.mjs';
import {RUBRIC_KEYS, SCHEMA_VERSION} from './validate-four-protocol.mjs';

const A = '1'.repeat(40), B = '2'.repeat(40), REPO = 'afaghx-afaghx/platform';
const runUrl = n => 'https://github.com/'+REPO+'/actions/runs/'+n;
function rubric(total) {
  let n=total;
  return Object.fromEntries(RUBRIC_KEYS.map(k => { const score=Math.min(1,Math.max(0,n)); n=Math.round((n-score)*10)/10; return [k,{score,evidence:'source/test evidence for '+k}]; }));
}
function a(stage, sha, score, run, from) {
  return {stage,commit_sha:sha,...(from===undefined?{}:{from_score:from,findings_addressed:'fixed identified validator bypasses and added regression tests'}),
    rubric:rubric(score),tests:[{status:'passed',command:'node --test scripts/engineering/*.test.mjs',evidence:'CI test summary',commit_sha:sha}],ci:{conclusion:'success',url:runUrl(run)}};
}
function validReport() {
 return {schema_version:SCHEMA_VERSION,task:{id:'AFX-ENG-4P-001',scope:'Policy enforcement',repository:REPO,pull_request_number:77,base_sha:A,head_sha:B},
  audit:{completed:true,changed_files:['scripts/engineering/validate-pr-four-protocol.mjs'],findings:[]},
  assessments:[a('initial',A,8.5,1001),a('remediation-1',B,9.5,1002,8.5)],
  final:{decision:'FINAL_TECHNICAL_CANDIDATE',independent_review:'PENDING',production_status:'NOT_PROVEN',evidence_artifacts:['scripts/engineering/validate-pr-four-protocol.test.mjs']}};
}
const body = report => '## Summary\n\n<!-- AFX-FOUR-PROTOCOL-REPORT-JSON\n'+JSON.stringify(report)+'\n-->\n';
function event(report, over={}) { return {repository:{full_name:REPO},pull_request:{number:77,body:body(report),head:{sha:B},base:{sha:A},...over}}; }
function fetchMock() {
 return async (url) => {
  const runId=url.match(/actions\/runs\/(\d+)/)?.[1];
  if(url.includes('/pulls/77/files?')) return {ok:true,status:200,json:async()=>[{filename:'scripts/engineering/validate-pr-four-protocol.mjs'}]};
  if(url.includes('/jobs?')) return {ok:true,status:200,json:async()=>({jobs:[{name:'four-protocol-contract',status:'completed',conclusion:'success'}]})};
  if(runId==='1001') return {ok:true,status:200,json:async()=>({head_sha:A,path:'.github/workflows/afx-four-protocol-policy.yml',event:'pull_request',pull_requests:[{number:77}]})};
  if(runId==='1002') return {ok:true,status:200,json:async()=>({head_sha:B,path:'.github/workflows/afx-four-protocol-policy.yml',event:'pull_request',pull_requests:[{number:77}]})};
  return {ok:false,status:404,json:async()=>({})};
 };
}
test('parses the explicit report marker',()=>assert.equal(parseReportFromBody(body(validReport())).task.pull_request_number,77));
test('fails closed when marker is absent or malformed',()=>{assert.throws(()=>parseReportFromBody('no report'),/must contain/);assert.throws(()=>parseReportFromBody('<!-- AFX-FOUR-PROTOCOL-REPORT-JSON\nnot json\n-->'),/not valid JSON/);});
test('accepts only live-matching PR files, SHAs and successful CI jobs',async()=>{const result=await validatePullRequestEvent(event(validReport()),{token:'test',fetchImpl:fetchMock()});assert.equal(result.valid,true);assert.equal(result.finalScore,9.5);});
test('rejects a copied report for another PR',async()=>{const r=validReport();r.task.pull_request_number=76;await assert.rejects(()=>validatePullRequestEvent(event(r),{token:'test',fetchImpl:fetchMock()}),/PR number/);});
test('rejects CI evidence from another commit',async()=>{const r=validReport();r.assessments[1].ci.url=runUrl(1001);await assert.rejects(()=>validatePullRequestEvent(event(r),{token:'test',fetchImpl:fetchMock()}),/head SHA/);});
test('rejects evidence from a different workflow',async()=>{const f=async url=>{const x=await fetchMock()(url);if(url.includes('/runs/1002'))return {...x,json:async()=>({head_sha:B,path:'.github/workflows/other.yml',event:'pull_request',pull_requests:[{number:77}]})};return x;};await assert.rejects(()=>validatePullRequestEvent(event(validReport()),{token:'test',fetchImpl:f}),/not from the AFAGHX/);});
test('rejects stale base SHA',async()=>{await assert.rejects(()=>validatePullRequestEvent(event(validReport(),{base:{sha:'3'.repeat(40)}}),{token:'test',fetchImpl:fetchMock()}),/base SHA/);});
