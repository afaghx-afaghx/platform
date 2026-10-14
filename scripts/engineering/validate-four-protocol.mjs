import fs from 'node:fs';

export const SCHEMA_VERSION = 'AFX-ENG-4P-001/v1';
export const RUBRIC_KEYS = [
  'architecture_and_scope', 'functional_correctness', 'security_boundaries',
  'positive_and_negative_tests', 'failure_and_edge_handling',
  'data_integrity_and_concurrency', 'observability_and_audit',
  'operations_and_rollback', 'ci_reproducibility', 'documentation_and_maintainability',
];

const shaOk = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const need = (condition, message) => { if (!condition) throw new Error(message); };
const safePath = value => typeof value === 'string' && value.length > 0 &&
  !value.startsWith('/') && !value.split(/[\\/]/).includes('..');

export function scoreAssessment(assessment) {
  need(assessment && typeof assessment === 'object', 'assessment must be an object');
  need(assessment.rubric && typeof assessment.rubric === 'object', 'rubric is required');
  const keys = Object.keys(assessment.rubric).sort();
  need(JSON.stringify(keys) === JSON.stringify([...RUBRIC_KEYS].sort()), 'rubric must contain exactly the ten canonical dimensions');
  let score = 0;
  for (const key of RUBRIC_KEYS) {
    const item = assessment.rubric[key];
    need(item && [0, 0.5, 1].includes(item.score), 'invalid rubric score: ' + key);
    need(typeof item.evidence === 'string' && item.evidence.trim().length >= 4, 'missing evidence for rubric dimension: ' + key);
    score += item.score;
  }
  return Math.round(score * 10) / 10;
}

export function validateReport(report, options = {}) {
  need(report && report.schema_version === SCHEMA_VERSION, 'unsupported schema_version');
  const task = report.task;
  need(task && typeof task.id === 'string' && task.id.trim(), 'task.id is required');
  need(typeof task.scope === 'string' && task.scope.trim(), 'task.scope is required');
  need(task.repository === options.repository || (!options.repository && typeof task.repository === 'string'), 'task.repository mismatch');
  need(Number.isInteger(task.pull_request_number) && task.pull_request_number > 0, 'task.pull_request_number is required');
  need(shaOk(task.base_sha) && shaOk(task.head_sha), 'task base/head SHA must be full 40-character SHA');
  if (options.expectedHeadSha !== undefined) {
    need(shaOk(options.expectedHeadSha), 'expected head SHA is invalid');
    need(task.head_sha === options.expectedHeadSha, 'report head SHA does not match assessed PR head');
  }
  const audit = report.audit;
  need(audit && audit.completed === true, 'audit must be marked complete');
  need(Array.isArray(audit.changed_files) && audit.changed_files.length > 0, 'audit.changed_files is required');
  need(audit.changed_files.every(safePath), 'audit contains an unsafe file path');
  need(new Set(audit.changed_files).size === audit.changed_files.length, 'audit.changed_files contains duplicates');
  need(Array.isArray(audit.findings), 'audit.findings must be an array');
  const findingIds = new Set();
  for (const finding of audit.findings) {
    need(finding && typeof finding.id === 'string' && finding.id.trim(), 'finding id is required');
    need(!findingIds.has(finding.id), 'duplicate finding id: ' + finding.id);
    findingIds.add(finding.id);
    need(['critical', 'high', 'medium', 'low'].includes(finding.severity), 'invalid finding severity: ' + finding.id);
    need(['open', 'closed', 'blocked'].includes(finding.status), 'invalid finding status: ' + finding.id);
    need(typeof finding.evidence === 'string' && finding.evidence.trim(), 'finding evidence is required: ' + finding.id);
    need(finding.status !== 'blocked', 'blocked finding prevents finalization: ' + finding.id);
    need(!(['critical', 'high'].includes(finding.severity) && finding.status !== 'closed'),
      'unresolved critical/high finding: ' + finding.id);
  }
  need(Array.isArray(report.assessments) && report.assessments.length > 0, 'assessments are required');
  need(report.assessments[0].stage === 'initial', 'first assessment stage must be initial');
  const seenShas = new Set();
  const scores = [];
  for (let i = 0; i < report.assessments.length; i += 1) {
    const a = report.assessments[i];
    need(a.stage === 'initial' && i === 0 || a.stage === 'remediation-' + i,
      'assessment stages must be initial, then sequential remediation-N');
    need(shaOk(a.commit_sha), 'assessment commit SHA is invalid');
    need(!seenShas.has(a.commit_sha), 'each remediation must refer to a new commit SHA');
    seenShas.add(a.commit_sha);
    const score = scoreAssessment(a);
    scores.push({stage: a.stage, score, commit_sha: a.commit_sha});
    need(Array.isArray(a.tests) && a.tests.length > 0, 'test evidence is required: ' + a.stage);
    const intermediateLowScoreFailure = i < report.assessments.length - 1 && score <= 9 && a.ci?.conclusion === 'failure';
    for (const t of a.tests) {
      const acceptedStatus = intermediateLowScoreFailure ? ['passed', 'failed'].includes(t?.status) : t?.status === 'passed';
      need(t && acceptedStatus && t.commit_sha === a.commit_sha,
        'test evidence must match the assessed commit and pass after remediation: ' + a.stage);
      need(typeof t.command === 'string' && t.command.trim() &&
        typeof t.evidence === 'string' && t.evidence.trim(), 'test command/evidence missing: ' + a.stage);
    }
    need(a.ci && (a.ci.conclusion === 'success' || intermediateLowScoreFailure),
      'CI must succeed for the final assessment; low-scoring intermediate attempts may fail: ' + a.stage);
    if (a.ci.conclusion === 'failure') {
      need(intermediateLowScoreFailure && a.tests.some(t => t.status === 'failed'),
        'only a non-final low-scoring assessment may record a failed test/CI run');
    } else {
      need(a.tests.every(t => t.status === 'passed'), 'successful CI requires every recorded test to pass: ' + a.stage);
    }
    const expectedPrefix = 'https://github.com/' + task.repository + '/actions/runs/';
    need(typeof a.ci.url === 'string' && a.ci.url.startsWith(expectedPrefix) &&
      /^[0-9]+$/.test(a.ci.url.slice(expectedPrefix.length)), 'CI URL must be a canonical GitHub Actions run URL');
    if (i > 0) {
      need(a.from_score === scores[i - 1].score, 'remediation must cite the previous calculated score');
      need(typeof a.findings_addressed === 'string' && a.findings_addressed.trim(), 'remediation must explain changes');
    }
  }
  need(report.assessments.at(-1).commit_sha === task.head_sha, 'final assessment must bind to task head SHA');
  if (scores[0].score <= 9) need(report.assessments.length >= 2, 'initial score <=9 requires remediation and rescoring');
  need(scores.at(-1).score > 9, 'final evidence-derived score must be strictly greater than 9/10');
  need(report.final && report.final.decision === 'FINAL_TECHNICAL_CANDIDATE', 'decision must be FINAL_TECHNICAL_CANDIDATE');
  need(report.final.independent_review === 'PENDING' || report.final.independent_review === 'APPROVED',
    'independent_review must be PENDING or APPROVED');
  need(report.final.production_status === 'NOT_PROVEN', 'this validator must not issue production/PROVEN status');
  need(Array.isArray(report.final.evidence_artifacts) && report.final.evidence_artifacts.length > 0 &&
    report.final.evidence_artifacts.every(safePath), 'final evidence artifact paths are required');
  return {valid: true, scores, finalScore: scores.at(-1).score};
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  try {
    const index = process.argv.indexOf('--report');
    const expectedIndex = process.argv.indexOf('--expected-head');
    if (index < 0 || !process.argv[index + 1]) throw new Error('--report <path> is required');
    let expectedHeadSha;
    if (expectedIndex >= 0) {
      expectedHeadSha = process.argv[expectedIndex + 1];
      if (!expectedHeadSha) throw new Error('--expected-head <sha> requires a value');
    }
    const report = JSON.parse(fs.readFileSync(process.argv[index + 1], 'utf8'));
    const result = validateReport(report, {expectedHeadSha, repository: report.task?.repository});
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('AFX-FOUR-PROTOCOL FAIL: ' + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}
