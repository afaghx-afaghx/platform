import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function fail(message) { throw new Error(message); }
function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

export function parseMatrixControls(matrixText) {
  const rows = matrixText.split(/\r?\n/).filter((line) => /^\| G01-\d+ \|/.test(line));
  return rows.map((line) => {
    const cells = line.split("|").map((cell) => cell.trim());
    return { id: cells[1], status: cells[3] };
  });
}

export function validateManifestModel(manifest) {
  if (!manifest || manifest.gate !== "G01" || manifest.version !== 2) fail("invalid_manifest_header");
  if (!/^[0-9a-f]{40}$/.test(manifest.sourceCommit)) fail("invalid_source_commit");
  if (!Array.isArray(manifest.doneControls) || manifest.doneControls.length === 0) fail("done_controls_required");

  const ids = new Set();
  for (const control of manifest.doneControls) {
    if (!/^G01-\d{2}$/.test(control.id) || ids.has(control.id)) fail("invalid_or_duplicate_control:" + control.id);
    ids.add(control.id);

    if (!control.implementation?.length || !control.tests?.length || !control.workflows?.length) {
      fail("incomplete_" + control.id);
    }

    for (const file of [...control.implementation, ...control.tests]) {
      if (typeof file !== "string" || path.isAbsolute(file) || file.includes("..")) {
        fail("unsafe_path_" + control.id);
      }
    }

    for (const workflow of control.workflows) {
      if (!workflow?.path || !workflow?.job) fail("invalid_workflow_reference_" + control.id);
      if (path.isAbsolute(workflow.path) || workflow.path.includes("..")) {
        fail("unsafe_workflow_path_" + control.id);
      }
    }
  }
  return ids;
}

export function verifyEvidence({
  root = process.cwd(),
  manifestPath = "docs/security/gate01-evidence-manifest.json",
  matrixPath = "docs/security/AFX-CORE-GATE-01-CLOSURE-MATRIX.md",
} = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), "utf8"));
  const matrix = fs.readFileSync(path.join(root, matrixPath), "utf8");

  const manifestIds = validateManifestModel(manifest);
  const matrixControls = parseMatrixControls(matrix);
  const done = matrixControls.filter((control) => control.status === "DONE").map((control) => control.id);
  const doneSet = new Set(done);

  const missingFromManifest = done.filter((id) => !manifestIds.has(id));
  const staleManifest = [...manifestIds].filter((id) => !doneSet.has(id));
  if (missingFromManifest.length) fail("done_controls_without_evidence:" + missingFromManifest.join(","));
  if (staleManifest.length) fail("manifest_controls_not_DONE:" + staleManifest.join(","));

  try {
    execFileSync("git", ["merge-base", "--is-ancestor", manifest.sourceCommit, "HEAD"], { cwd: root, stdio: "ignore" });
  } catch {
    fail("source_commit_not_ancestor_of_head:" + manifest.sourceCommit);
  }

  const checkedFiles = new Set();
  for (const control of manifest.doneControls) {
    for (const file of [...control.implementation, ...control.tests]) {
      const full = path.join(root, file);
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) fail("missing_file:" + file);

      const actual = git(root, ["hash-object", file]);
      const expected = git(root, ["rev-parse", manifest.sourceCommit + ":" + file]);
      if (actual !== expected) fail("hash_mismatch:" + file + ":" + expected + "!=" + actual);
      checkedFiles.add(file);
    }

    for (const workflow of control.workflows) {
      const full = path.join(root, workflow.path);
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) fail("missing_workflow:" + workflow.path);
      const content = fs.readFileSync(full, "utf8");
      if (!content.includes("  " + workflow.job + ":")) fail("missing_job:" + workflow.path + ":" + workflow.job);
    }
  }

  return {
    status: "PASS",
    gate: manifest.gate,
    sourceCommit: manifest.sourceCommit,
    doneControls: done,
    checkedFiles: [...checkedFiles].sort(),
    checkedEntries: checkedFiles.size,
  };
}

export function main() {
  console.log(JSON.stringify(verifyEvidence(), null, 2));
}

if (import.meta.url === "file://" + process.argv[1]) main();
