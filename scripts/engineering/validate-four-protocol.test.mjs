import test from 'node:test';
import assert from 'node:assert/strict';
import {RUBRIC_KEYS, SCHEMA_VERSION, scoreAssessment, validateReport} from './validate-four-protocol.mjs';

const S1 = '1'.repeat(40), S2 = '2'.repeat(40);
const rubric = (total) => {
  let left = total;
  return Object.fromEntries(RUBRIC_KEYS.map(key => {
    const score = Math.min(1, Math.max(0, left));
    left = Math.round((left - score) * 10) / 10;
    return [key, {score, evidence: 'source and test evidence for ' + key}];
  }));
};
const assessment = (stage, sha, total, runId, fromScore) => ({
  stage, commit_sha: sha, ...(fromScore === undefined ? {} : {from_score: fromScore, findings_addressed: 'Hardened fail-closed cases and added regression coverage.'}),
  rubric: rubric(total),
  tests: [{name: 'unit tests', status: stage === 'initial' ? 'failed' : 'passed', command: 'node --test scripts/engineering/*.test.mjs', evidence: stage === 'initial' ? 'Initial CI log captured one regression failure and triggered remediation.' : 'All validator contract tests passed on this commit.', commit_sha: sha}],
  ci: {conclusion: stage === 'initial' ? 'failure' : 'success', url: 'https://github.com/afaghx-afaghx/platform/actions/runs/' + runId},
});
function report() {
  return {
    schema_version: SCHEMA_VERSION,
    task: {id: 'AFX-ENG-4P-TEST', scope: 'Validator contract', repository: 'afaghx-afaghx/platform', pull_request_number: 77, base_sha: S1, head_sha: S2},
    audit: {completed: true, changed_files: ['scripts/engineering/validate-four-protocol.mjs'], findings: []},
    assessments: [assessment('initial', S1, 8.5, 1001), assessment('remediation-1', S2, 9.5, 1002, 8.5)],
    final: {decision: 'FINAL_TECHNICAL_CANDIDATE', independent_review: 'PENDING', production_status: 'NOT_PROVEN', evidence_artifacts: ['scripts/engineering/validate-four-protocol.test.mjs']},
  };
}

test('calculates the score from exactly ten rubric dimensions', () => assert.equal(scoreAssessment({rubric: rubric(9.5)}), 9.5));
test('accepts evidence-backed remediation from 8.5 to 9.5', () => assert.equal(validateReport(report(), {expectedHeadSha: S2, repository: 'afaghx-afaghx/platform'}).finalScore, 9.5));
test('rejects final scores of 9 or lower', () => { const r = report(); r.assessments[1].rubric = rubric(9); assert.throws(() => validateReport(r), /strictly greater than 9/); });
test('requires remediation after initial score <=9', () => { const r = report(); r.assessments = [r.assessments[0]]; r.task.head_sha = S1; assert.throws(() => validateReport(r), /requires remediation/); });
test('rejects duplicate commit SHA for remediation', () => { const r = report(); r.assessments[1].commit_sha = S1; r.assessments[1].tests[0].commit_sha = S1; r.task.head_sha = S1; assert.throws(() => validateReport(r), /new commit SHA/); });
test('rejects missing rubric dimensions', () => { const r = report(); delete r.assessments[1].rubric.architecture_and_scope; assert.throws(() => validateReport(r), /exactly the ten/); });
test('rejects missing evidence', () => { const r = report(); r.assessments[1].rubric.architecture_and_scope.evidence = ''; assert.throws(() => validateReport(r), /missing evidence/); });
test('rejects unresolved critical findings', () => { const r = report(); r.audit.findings.push({id:'F1',severity:'critical',status:'open',evidence:'repro test'}); assert.throws(() => validateReport(r), /unresolved critical/); });
test('rejects blocked low severity finding', () => { const r = report(); r.audit.findings.push({id:'F1',severity:'low',status:'blocked',evidence:'external dependency'}); assert.throws(() => validateReport(r), /blocked finding/); });
test('rejects path traversal in audit scope', () => { const r = report(); r.audit.changed_files = ['../secret']; assert.throws(() => validateReport(r), /unsafe file path/); });
test('rejects test results bound to another SHA', () => { const r = report(); r.assessments[1].tests[0].commit_sha = S1; assert.throws(() => validateReport(r), /assessed commit/); });
test('rejects a stale expected head SHA', () => assert.throws(() => validateReport(report(), {expectedHeadSha:S1}), /does not match/));
test('never accepts production as proven from this technical gate', () => { const r = report(); r.final.production_status = 'PROVEN'; assert.throws(() => validateReport(r), /must not issue production/); });
test('rejects invalid rubric scores', () => { const r = report(); r.assessments[1].rubric.architecture_and_scope.score = 0.25; assert.throws(() => validateReport(r), /invalid rubric score/); });

test('accepts failed initial CI only when it is followed by passing remediation', () => {
  const r = report();
  assert.equal(validateReport(r, {expectedHeadSha: S2, repository: 'afaghx-afaghx/platform'}).finalScore, 9.5);
  r.assessments[1].tests[0].status = 'failed';
  r.assessments[1].ci.conclusion = 'failure';
  assert.throws(() => validateReport(r), /pass after remediation/);
});
