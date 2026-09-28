import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function fail(message) { throw new Error(message); }
function git(root, args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); }

export function parseDoneControls(matrixText) {
  const rows = matrixText.split(/\r?\n/).filter(line => /^\| G01-\d+ \|/.test(line));
  return rows.filter(line => line.split('|')[3]?.trim() === 'DONE').map(line => line.split('|')[1].trim());
}

export function validateManifestModel(manifest) {
  if (!manifest || manifest.gate !== 'G01' || manifest.version !== 2) fail('invalid_manifest_header');
  if (!/^[0-9a-f]{40}$/.test(manifest.candidateCommit)) fail('invalid_candidate_commit');
  if (!manifest.fileHashes || !manifest.workflowHashes) fail('hash_maps_required');
  if (!Array.isArray(manifest.doneControls) || manifest.doneControls.length === 0) fail('done_controls_required');
  const ids = new Set();
  for (const control of manifest.doneControls) {
    if (!/^G01-\d{2}$/.test(control.id) || ids.has(control.id)) fail('invalid_or_duplicate_control');
    ids.add(control.id);
    if (!control.implementation?.length || !control.tests?.length || !control.workflows?.length) fail('incomplete_' + control.id);
    for (const file of [...control.implementation, ...control.tests]) {
      if (typeof file !== 'string' || path.isAbsolute(file) || file.includes('..')) fail('unsafe_path_' + control.id);
      if (!/^[0-9a-f]{40}$/.test(manifest.fileHashes[file] || '')) fail('missing_file_hash:' + file);
    }
    for (const wf of control.workflows) {
      if (!wf?.path || !wf?.job) fail('invalid_workflow_reference_' + control.id);
      if (path.isAbsolute(wf.path) || wf.path.includes('..')) fail('unsafe_workflow_path_' + control.id);
      if (!/^[0-9a-f]{40}$/.test(manifest.workflowHashes[wf.path] || '')) fail('missing_workflow_hash:' + wf.path);
    }
  }
  return ids;
}

export function verifyEvidence({ root = process.cwd(), manifestPath = 'docs/security/gate01-evidence-manifest.json', matrixPath = 'docs/security/AFX-CORE-GATE-01-CLOSURE-MATRIX.md', expectedCandidateCommit = process.env.GATE01_CANDIDATE_COMMIT || null } = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), 'utf8'));
  const matrix = fs.readFileSync(path.join(root, matrixPath), 'utf8');
  const ids = validateManifestModel(manifest);
  const done = parseDoneControls(matrix);
  const missing = done.filter(id => !ids.has(id));
  if (missing.length) fail('done_controls_without_evidence:' + missing.join(','));
  const verificationCommit = expectedCandidateCommit || git(root, ['rev-parse', 'HEAD']);
  if (manifest.candidateCommit !== verificationCommit) fail('candidate_commit_mismatch:' + manifest.candidateCommit + '!=' + verificationCommit);
  try { execFileSync('git', ['merge-base', '--is-ancestor', manifest.candidateCommit, 'HEAD'], { cwd: root, stdio: 'ignore' }); }
  catch { fail('candidate_commit_not_ancestor_of_verification_checkout:' + manifest.candidateCommit); }
  const checkedFiles = new Set();
  for (const control of manifest.doneControls) {
    for (const file of [...control.implementation, ...control.tests]) {
      const full = path.join(root, file);
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) fail('missing_file:' + file);
      const actual = git(root, ['hash-object', file]);
      const expected = manifest.fileHashes[file];
      if (actual !== expected) fail('hash_mismatch:' + file + ':' + expected + '!=' + actual);
      checkedFiles.add(file);
    }
    for (const wf of control.workflows) {
      const full = path.join(root, wf.path);
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) fail('missing_workflow:' + wf.path);
      const actual = git(root, ['hash-object', wf.path]);
      const expected = manifest.workflowHashes[wf.path];
      if (actual !== expected) fail('workflow_hash_mismatch:' + wf.path + ':' + expected + '!=' + actual);
      const content = fs.readFileSync(full, 'utf8');
      if (!content.includes('  ' + wf.job + ':')) fail('missing_job:' + wf.path + ':' + wf.job);
      checkedFiles.add(wf.path);
    }
  }
  return { gate: manifest.gate, candidateCommit: manifest.candidateCommit, doneControls: done, checkedFiles: [...checkedFiles].sort(), checkedEntries: checkedFiles.size };
}

export function main() { console.log(JSON.stringify({ status: 'PASS', ...verifyEvidence() }, null, 2)); }
if (import.meta.url === 'file://' + process.argv[1]) main();
