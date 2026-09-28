import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDoneControls, validateManifestModel } from './verify-gate01-evidence.mjs';

const valid = {
  version: 2,
  gate: 'G01',
  candidateCommit: '54e72622ef66f79e7b219f0ffd38b44170bd521f',
  fileHashes: { 'core/AFX-CORE/src/security.js': '0000000000000000000000000000000000000000', 'core/AFX-CORE/test/security.test.js': '0000000000000000000000000000000000000000' },
  workflowHashes: { '.github/workflows/afx-core-gate-01.yml': '0000000000000000000000000000000000000000' },
  doneControls: [{
    id: 'G01-01',
    implementation: ['core/AFX-CORE/src/security.js'],
    tests: ['core/AFX-CORE/test/security.test.js'],
    workflows: [{ path: '.github/workflows/afx-core-gate-01.yml', job: 'bootstrap-security-tests' }],
  }]
};

test('negative invalid gate fails', () => {
  assert.throws(() => validateManifestModel({ ...valid, gate: 'X' }), /invalid_manifest_header/);
});

test('negative invalid source fails', () => {
  assert.throws(() => validateManifestModel({ ...valid, candidateCommit: 'bad' }), /invalid_candidate_commit/);
});

test('negative empty control set fails', () => {
  assert.throws(() => validateManifestModel({ ...valid, doneControls: [] }), /done_controls_required/);
});

test('negative duplicate control fails', () => {
  assert.throws(() => validateManifestModel({ ...valid, doneControls: [valid.doneControls[0], valid.doneControls[0]] }), /invalid_or_duplicate_control/);
});

test('negative unsafe path fails', () => {
  const bad = { ...valid, doneControls: [{ ...valid.doneControls[0], implementation: ['../outside.txt'] }] };
  assert.throws(() => validateManifestModel(bad), /unsafe_path_G01-01/);
});

test('matrix parser only returns explicit DONE rows', () => {
  const matrix = '| G01-01 | Password | DONE |\n| G01-13 | Crypto | IN PROGRESS |';
  assert.deepEqual(parseDoneControls(matrix), ['G01-01']);
});
