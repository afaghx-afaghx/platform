import test from "node:test";
import assert from "node:assert/strict";
import {
  parseGate01Matrix,
  isRemediationOnlyPath,
  evaluateGate01
} from "./gate01-policy.mjs";

function matrixWithStatuses(overrides = {}) {
  return Array.from({ length: 26 }, (_, index) => {
    const id = "G01-" + String(index + 1).padStart(2, "0");
    const status = overrides[id] ?? (index < 9 ? "DONE" : "IN PROGRESS");
    return `| ${id} | Control ${index + 1} | ${status} | owner | file | test | ci | evidence | criterion |`;
  }).join("\n");
}

test("matrix parser requires exactly the 26 ordered control IDs", () => {
  const controls = parseGate01Matrix(matrixWithStatuses());
  assert.equal(controls.length, 26);
  assert.equal(controls[0].id, "G01-01");
  assert.equal(controls[25].id, "G01-26");
  assert.throws(() => parseGate01Matrix(matrixWithStatuses().split("\n").slice(1).join("\n")), /invalid_control_count/);
});

test("matrix parser rejects duplicated or out-of-order control IDs", () => {
  const rows = matrixWithStatuses().split("\n");
  rows[1] = rows[0];
  assert.throws(() => parseGate01Matrix(rows.join("\n")), /invalid_control_order_or_duplicate/);
});

test("matrix parser rejects unknown status values", () => {
  const rows = matrixWithStatuses({ "G01-10": "PROVEN" });
  assert.throws(() => parseGate01Matrix(rows), /invalid_control_status/);
});

test("only explicit Gate-01 remediation paths qualify for a red-gate PR exception", () => {
  assert.equal(isRemediationOnlyPath("core/AFX-CORE/src/repository.js"), true);
  assert.equal(isRemediationOnlyPath(".github/workflows/afx-core-gate-01.yml"), true);
  assert.equal(isRemediationOnlyPath("scripts/gate01-policy.test.mjs"), true);
  assert.equal(isRemediationOnlyPath("domains/product/product.mjs"), false);
  assert.equal(isRemediationOnlyPath("experience/web/src/main.js"), false);
  assert.equal(isRemediationOnlyPath("core/AFX-CORE/../domains/product/x.mjs"), false);
});

test("red Gate-01 permits scoped remediation PRs while keeping the gate explicitly RED", () => {
  const result = evaluateGate01({
    matrixText: matrixWithStatuses({ "G01-10": "IN PROGRESS", "G01-20": "BLOCKED" }),
    changedFiles: [
      "core/AFX-CORE/src/repository.js",
      "core/AFX-CORE/test/persistence.test.js",
      "docs/security/AFX-CORE-GATE-01-CLOSURE-MATRIX.md"
    ],
    eventName: "pull_request"
  });
  assert.equal(result.pass, true);
  assert.equal(result.decision, "REMEDIATION_ONLY_PR");
  assert.equal(result.matrixStatus, "RED");
  assert.equal(result.unresolved.length, 17);
  assert.match(result.note, /Domain Freeze remains ACTIVE/);
});

test("red Gate-01 blocks Main push even when the last commit touches remediation paths", () => {
  const result = evaluateGate01({
    matrixText: matrixWithStatuses(),
    changedFiles: ["core/AFX-CORE/src/repository.js"],
    eventName: "push"
  });
  assert.equal(result.pass, false);
  assert.equal(result.decision, "GATE_RED_DOMAIN_FREEZE_ACTIVE");
  assert.equal(result.matrixStatus, "RED");
});

test("red Gate-01 blocks a PR that mixes remediation with domain or experience changes", () => {
  const result = evaluateGate01({
    matrixText: matrixWithStatuses(),
    changedFiles: [
      "core/AFX-CORE/src/repository.js",
      "domains/product/product.mjs"
    ],
    eventName: "pull_request"
  });
  assert.equal(result.pass, false);
  assert.equal(result.decision, "GATE_RED_DOMAIN_FREEZE_ACTIVE");
  assert.deepEqual(result.blockedFiles, ["domains/product/product.mjs"]);
});

test("all 26 DONE rows are only a matrix result, not a Production or PROVEN claim", () => {
  const matrix = matrixWithStatuses(Object.fromEntries(
    Array.from({ length: 26 }, (_, index) => [
      "G01-" + String(index + 1).padStart(2, "0"),
      "DONE"
    ])
  ));
  const result = evaluateGate01({
    matrixText: matrix,
    changedFiles: ["core/AFX-CORE/src/repository.js"],
    eventName: "pull_request"
  });
  assert.equal(result.pass, true);
  assert.equal(result.decision, "MATRIX_ALL_DONE");
  assert.deepEqual(result.unresolved, []);
  assert.match(result.note, /Evidence verification.*independent security review.*separate gates/);
});
