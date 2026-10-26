import test from "node:test";
import assert from "node:assert/strict";
import { parseMatrixControls, validateManifestModel } from "./verify-gate01-evidence.mjs";

const valid = {
  version: 2,
  gate: "G01",
  sourceCommit: "d62ef9f68b7554992815b665e5f8e88e4f371103",
  doneControls: [{
    id: "G01-01",
    implementation: ["core/AFX-CORE/src/security.js"],
    tests: ["core/AFX-CORE/test/security.test.js"],
    workflows: [{ path: ".github/workflows/afx-core-security.yml", job: "security-tests" }]
  }]
};

test("invalid gate fails closed", () => {
  assert.throws(() => validateManifestModel({ ...valid, gate: "X" }), /invalid_manifest_header/);
});

test("invalid source commit fails closed", () => {
  assert.throws(() => validateManifestModel({ ...valid, sourceCommit: "bad" }), /invalid_source_commit/);
});

test("empty DONE set fails closed", () => {
  assert.throws(() => validateManifestModel({ ...valid, doneControls: [] }), /done_controls_required/);
});

test("duplicate control fails closed", () => {
  assert.throws(
    () => validateManifestModel({ ...valid, doneControls: [valid.doneControls[0], valid.doneControls[0]] }),
    /invalid_or_duplicate_control/
  );
});

test("unsafe paths fail closed", () => {
  assert.throws(
    () => validateManifestModel({
      ...valid,
      doneControls: [{ ...valid.doneControls[0], implementation: ["../outside.txt"] }]
    }),
    /unsafe_path_G01-01/
  );
});

test("matrix parser captures explicit statuses", () => {
  const matrix = "| G01-01 | Password | DONE |\n| G01-13 | Crypto | IN PROGRESS |";
  assert.deepEqual(parseMatrixControls(matrix), [
    { id: "G01-01", status: "DONE" },
    { id: "G01-13", status: "IN PROGRESS" }
  ]);
});
