import fs from 'node:fs';
import {validateReport} from './validate-four-protocol.mjs';

const MARKER_START = '<!-- AFX-FOUR-PROTOCOL-REPORT-JSON';
const MARKER_END = '-->';

export function parseReportFromBody(body) {
  if (typeof body !== 'string') throw new Error('PR body is missing');
  const start = body.indexOf(MARKER_START);
  const end = body.indexOf(MARKER_END, start + MARKER_START.length);
  if (start < 0 || end < 0) throw new Error('PR body must contain the AFX-FOUR-PROTOCOL-REPORT-JSON block');
  const raw = body.slice(start + MARKER_START.length, end).trim();
  const cleaned = raw.replace(/^\n?/, '').trim();
  if (!cleaned.startsWith('{')) throw new Error('four-protocol report JSON is absent from marker block');
  try { return JSON.parse(cleaned); } catch { throw new Error('four-protocol report block is not valid JSON'); }
}

async function requestJson(url, token, apiUrl, fetchImpl) {
  const response = await fetchImpl(url, {headers: {accept:'application/vnd.github+json', authorization:'Bearer '+token, 'x-github-api-version':'2022-11-28'}});
  if (!response.ok) throw new Error('GitHub API request failed ('+response.status+'): '+url);
  return response.json();
}

async function verifyCi(assessment, task, token, apiUrl, fetchImpl) {
  const prefix = 'https://github.com/' + task.repository + '/actions/runs/';
  if (!assessment.ci.url.startsWith(prefix)) throw new Error('non-canonical CI run URL');
  const id = assessment.ci.url.slice(prefix.length);
  if (!/^[0-9]+$/.test(id)) throw new Error('invalid CI run id');
  const run = await requestJson(apiUrl+'/repos/'+task.repository+'/actions/runs/'+id, token, apiUrl, fetchImpl);
  if (run.head_sha !== assessment.commit_sha) throw new Error('CI head SHA does not match assessment '+assessment.stage);
  if (run.conclusion !== assessment.ci.conclusion) throw new Error('CI run conclusion does not match the report for '+assessment.stage);
  if (run.path !== '.github/workflows/afx-four-protocol-policy.yml') throw new Error('CI evidence is not from the AFAGHX Four-Protocol Policy workflow');
  if (run.event !== 'pull_request' || !(run.pull_requests || []).some(p => p.number === task.pull_request_number)) throw new Error('CI run is not associated with this pull request');
  const jobs = await requestJson(apiUrl+'/repos/'+task.repository+'/actions/runs/'+id+'/jobs?per_page=100', token, apiUrl, fetchImpl);
  const expectedJobConclusion = assessment.ci.conclusion;
  const validJob = (jobs.jobs || []).some(j => j.name === 'four-protocol-contract' && j.status === 'completed' && j.conclusion === expectedJobConclusion);
  if (!validJob) throw new Error('four-protocol-contract CI job does not match the recorded result for '+assessment.stage);
  // validateReport permits a failed run only for a non-final score <=9; every later final gate is fail-closed.
}

export async function validatePullRequestEvent(event, options = {}) {
  const pr = event.pull_request;
  if (!pr || !event.repository?.full_name) throw new Error('not a pull_request event');
  const report = parseReportFromBody(pr.body);
  const repository = event.repository.full_name;
  if (report.task.repository !== repository || report.task.pull_request_number !== pr.number) throw new Error('report must match repository and PR number');
  if (report.task.base_sha !== pr.base.sha) throw new Error('report base SHA does not match current PR base');
  const validation = validateReport(report, {repository, expectedHeadSha:pr.head.sha});
  const token = options.token;
  const apiUrl = (options.apiUrl || 'https://api.github.com').replace(/\/$/, '');
  const fetchImpl = options.fetchImpl || fetch;
  if (!token) throw new Error('GITHUB_TOKEN is required to verify live CI evidence');
  const changedResponse = await requestJson(apiUrl+'/repos/'+repository+'/pulls/'+pr.number+'/files?per_page=100', token, apiUrl, fetchImpl);
  const actualFiles = changedResponse.map(f => f.filename).sort();
  const reportedFiles = [...report.audit.changed_files].sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(reportedFiles)) throw new Error('audit.changed_files must exactly match GitHub changed files');
  for (const assessment of report.assessments) await verifyCi(assessment, report.task, token, apiUrl, fetchImpl);
  return {valid:true, scores:validation.scores, finalScore:validation.finalScore, productionStatus:report.final.production_status};
}

async function main() {
  try {
    const path = process.env.GITHUB_EVENT_PATH;
    if (!path) throw new Error('GITHUB_EVENT_PATH is required');
    const event = JSON.parse(fs.readFileSync(path, 'utf8'));
    const result = await validatePullRequestEvent(event, {token:process.env.GITHUB_TOKEN, apiUrl:process.env.GITHUB_API_URL});
    console.log('AFX-FOUR-PROTOCOL PASS: PR #'+event.pull_request.number+' scores '+result.scores.map(s=>s.stage+'='+s.score+'/10').join(', ')+'; production='+result.productionStatus);
  } catch (error) {
    console.error('AFX-FOUR-PROTOCOL FAIL: '+(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) await main();
