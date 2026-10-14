import fs from "node:fs";

const EXPECTED_IDS = Array.from({ length: 26 }, (_, index) =>
  "G01-" + String(index + 1).padStart(2, "0")
);
const ALLOWED_STATUSES = new Set(["DONE", "IN PROGRESS", "BLOCKED"]);
const REMEDIATION_PATHS = [
  /^core\/AFX-CORE\//,
  /^platform\/Gateway\//,
  /^infrastructure\/security\//,
  /^docs\/security\//,
  /^scripts\/(?:gate01-policy|verify-gate01-evidence)(?:\.test)?\.mjs$/,
  /^\.github\/workflows\/(?:afx-core-gate-01|afx-core-security|g01-11-http-auth|gate-01-evidence-verify)\.yml$/
];

function fail(code, detail) {
  const error = new Error(detail ? code + ":" + detail : code);
  error.code = code;
  throw error;
}

export function parseGate01Matrix(matrixText) {
  const rows = matrixText.split(/\r?\n/).filter((line) => /^\|\s*G01-\d{2}\s*\|/.test(line));
  if (rows.length !== EXPECTED_IDS.length) {
    fail("invalid_control_count", String(rows.length));
  }

  const controls = rows.map((line) => {
    const cells = line.split("|").map((cell) => cell.trim());
    return { id: cells[1], status: cells[3] };
  });

  const seen = new Set();
  for (let index = 0; index < EXPECTED_IDS.length; index += 1) {
    const control = controls[index];
    if (!control || control.id !== EXPECTED_IDS[index] || seen.has(control.id)) {
      fail("invalid_control_order_or_duplicate", "expected=" + EXPECTED_IDS[index] + ",actual=" + (control?.id ?? "missing"));
    }
    if (!ALLOWED_STATUSES.has(control.status)) {
      fail("invalid_control_status", control.id + "=" + control.status);
    }
    seen.add(control.id);
  }
  return controls;
}

export function isRemediationOnlyPath(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) return false;
  if (filePath.startsWith("/") || filePath.split("/").some((segment) => segment === ".." || segment === ".")) return false;
  return REMEDIATION_PATHS.some((pattern) => pattern.test(filePath));
}

export function evaluateGate01({ matrixText, changedFiles, eventName }) {
  const controls = parseGate01Matrix(matrixText);
  const unresolved = controls.filter((control) => control.status !== "DONE");
  const matrixStatus = unresolved.length === 0 ? "MATRIX_ALL_DONE" : "RED";

  if (unresolved.length === 0) {
    return {
      pass: true,
      decision: "MATRIX_ALL_DONE",
      matrixStatus,
      unresolved: [],
      note: "All 26 rows are marked DONE. Evidence verification, required CI checks, independent security review, and release authorization remain separate gates."
    };
  }

  const files = Array.isArray(changedFiles) ? changedFiles : [];
  const remediationOnly =
    eventName === "pull_request" &&
    files.length > 0 &&
    files.every(isRemediationOnlyPath);

  if (remediationOnly) {
    return {
      pass: true,
      decision: "REMEDIATION_ONLY_PR",
      matrixStatus,
      unresolved: unresolved.map((control) => ({ id: control.id, status: control.status })),
      note: "This PR contains only allowlisted Gate-01 remediation paths. Gate-01 remains RED and Domain Freeze remains ACTIVE; this exception is not a PROVEN or Production decision."
    };
  }

  return {
    pass: false,
    decision: "GATE_RED_DOMAIN_FREEZE_ACTIVE",
    matrixStatus,
    unresolved: unresolved.map((control) => ({ id: control.id, status: control.status })),
    blockedFiles: files.filter((file) => !isRemediationOnlyPath(file)),
    note: "Unresolved Gate-01 controls block non-remediation changes and Main release. Do not mark a control DONE without implementation, tests, CI, and reviewable evidence."
  };
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  try {
    const matrixPath = readArg("--matrix");
    const changedFilesPath = readArg("--changed-files");
    const eventName = readArg("--event");
    if (!matrixPath || !changedFilesPath || !eventName) {
      fail("usage", "node scripts/gate01-policy.mjs --matrix <path> --changed-files <path> --event <event>");
    }
    const matrixText = fs.readFileSync(matrixPath, "utf8");
    const changedFiles = fs.readFileSync(changedFilesPath, "utf8").split(/\r?\n/).filter(Boolean);
    const result = evaluateGate01({ matrixText, changedFiles, eventName });
    console.log(JSON.stringify(result, null, 2));
    if (!result.pass) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({
      pass: false,
      decision: "MATRIX_INVALID_OR_POLICY_ERROR",
      error: error?.message ?? String(error)
    }, null, 2));
    process.exitCode = 1;
  }
}
