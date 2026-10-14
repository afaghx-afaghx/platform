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
    rubric:rubric(score),tests:[{status:stage==='initial'?'failed':'passed',command:'node --test scripts/engineering/*.test.mjs',evidence:stage==='initial'?'Initial run exposed malformed-report expectation; remediation changes parser contract test.':'All contract tests pass on the assessed commit.',commit_sha:sha}],ci:{conclusion:stage==='initial'?'failure':'success',url:runUrl(run)}};
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
  if(url.includes('/jobs?')) return {ok:true,status:200,json:async()=>({jobs:[{name:'four-protocol-contract',status:'completed',conclusion:runId==='1001'?'failure':'success'}]})};
  if(runId==='1001') return {ok:true,status:200,json:async()=>({head_sha:A,conclusion:'failure',path:'.github/workflows/afx-four-protocol-policy.yml',event:'pull_request',pull_requests:[{number:77}]})};
  if(runId==='1002') return {ok:true,status:200,json:async()=>({head_sha:B,conclusion:'success',path:'.github/workflows/afx-four-protocol-policy.yml',event:'pull_request',pull_requests:[{number:77}]})};
  return {ok:false,status:404,json:async()=>({})};
 };
}
test('parses the explicit report marker',()=>assert.equal(parseReportFromBody(body(validReport())).task.pull_request_number,77));
test('fails closed when marker is absent or malformed',()=>{assert.throws(()=>parseReportFromBody('no report'),/must contain/);assert.throws(()=>parseReportFromBody('<!-- AFX-FOUR-PROTOCOL-REPORT-JSON\nnot json\n-->'),/not valid JSON/);});
test('accepts only live-matching PR files, SHAs and successful CI jobs',async()=>{const result=await validatePullRequestEvent(event(validReport()),{token:'test',fetchImpl:fetchMock()});assert.equal(result.valid,true);assert.equal(result.finalScore,9.5);});
test('rejects a copied report for another PR',async()=>{const r=validReport();r.task.pull_request_number=76;await assert.rejects(()=>validatePullRequestEvent(event(r),{token:'test',fetchImpl:fetchMock()}),/PR number/);});
test('rejects CI evidence from another commit',async()=>{const r=validReport();r.assessments[1].ci.url=runUrl(1001);await assert.rejects(()=>validatePullRequestEvent(event(r),{token:'test',fetchImpl:fetchMock()}),/head SHA/);});
test('rejects evidence from a different workflow',async()=>{const f=async url=>{const x=await fetchMock()(url);if(url.includes('/runs/1002'))return {...x,json:async()=>({head_sha:B,conclusion:'success',path:'.github/workflows/other.yml',event:'pull_request',pull_requests:[{number:77}]})};return x;};await assert.rejects(()=>validatePullRequestEvent(event(validReport()),{token:'test',fetchImpl:f}),/not from the AFAGHX/);});
test('rejects stale base SHA',async()=>{await assert.rejects(()=>validatePullRequestEvent(event(validReport(),{base:{sha:'3'.repeat(40)}}),{token:'test',fetchImpl:fetchMock()}),/base SHA/);});

test('rejects a report whose actual CI result differs from the recorded result', async () => {
  const f=async url => {
    const x=await fetchMock()(url);
    if(url.includes('/actions/runs/1001') && !url.includes('/jobs?')) return {...x,json:async()=>({head_sha:A,conclusion:'success',path:'.github/workflows/afx-four-protocol-policy.yml',event:'pull_request',pull_requests:[{number:77}]})};
    return x;
  };
  await assert.rejects(()=>validatePullRequestEvent(event(validReport()),{token:'test',fetchImpl:f}),/conclusion does not match/);
});

test('validates multiple failed intermediate rounds followed by successful final evidence', async () => {
  const r=validReport();
  const S3='3'.repeat(40), S4='4'.repeat(40);
  const middle=a('remediation-1',S3,9,1003,8.5);
  middle.tests[0].status='failed'; middle.ci.conclusion='failure';
  const final=a('remediation-2',S4,9.5,1004,9);
  r.assessments=[r.assessments[0],middle,final];
  r.task.head_sha=S4;
  const f=async url => {
    if(url.includes('/pulls/77/files?')) return {ok:true,status:200,json:async()=>[{filename:'scripts/engineering/validate-pr-four-protocol.mjs'}]};
    if(url.includes('/jobs?')) {
      const id=url.split('/actions/runs/')[1]?.split('/')[0].split('?')[0];
      const c=id==='1001'||id==='1003'?'failure':'success';
      return {ok:true,status:200,json:async()=>({jobs:[{name:'four-protocol-contract',status:'completed',conclusion:c}]})};
    }
    const id=url.split('/actions/runs/')[1]?.split('/')[0].split('?')[0];
    const sha={'1001':A,'1003':S3,'1004':S4}[id];
    const conclusion=id==='1004'?'success':'failure';
    return {ok:true,status:200,json:async()=>({head_sha:sha,conclusion,path:'.github/workflows/afx-four-protocol-policy.yml',event:'pull_request',pull_requests:[{number:77}]})};
  };
  const result=await validatePullRequestEvent(event(r,{head:{sha:S4}}),{token:'test',fetchImpl:f});
  assert.equal(result.valid,true);
  assert.equal(result.finalScore,9.5);
});
