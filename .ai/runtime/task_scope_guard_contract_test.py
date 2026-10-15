#!/usr/bin/env python3
"""Adversarial unit tests for the AFAGHX task-scope boundary."""
import io
import json
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest.mock import patch

import task_scope_guard as scope_guard
from task_scope_guard import GENERATED_ROOT_FILES, ScopeViolation, validate_scope

TASK_ID = "AFX-GOLDEN-LOCAL-001"
MODE = "golden-execution"
QUEUE = {
    "tasks": [{
        "id": TASK_ID,
        "status": "READY",
        "mode": MODE,
        "required_change_paths": [".ai/runtime/local-provider.contract.test.mjs"],
    }]
}
BASELINE = (json.dumps(QUEUE, separators=(",", ":")) + "\n").encode("utf-8")
REQUIRED = ".ai/runtime/local-provider.contract.test.mjs"


class ScopeGuardContractTests(unittest.TestCase):
    def validate(self, changed, *, current=BASELINE, mode=MODE):
        return validate_scope(TASK_ID, mode, BASELINE, current, changed)

    def test_accepts_only_required_task_change_and_known_generated_reports(self):
        changed = [REQUIRED, "agent-execution-notes.md", "agent-execution-prompt.md", "agent-execution-report.md"]
        self.assertEqual(self.validate(changed), sorted(changed))

    def test_rejects_task_queue_mutation_even_when_changed_paths_look_valid(self):
        mutated = (BASELINE + b" ")
        with self.assertRaisesRegex(ScopeViolation, "task queue must remain unchanged"):
            self.validate([REQUIRED], current=mutated)

    def test_rejects_mode_mismatch(self):
        with self.assertRaisesRegex(ScopeViolation, "mode is not governed"):
            self.validate([REQUIRED], mode="audit")

    def test_rejects_missing_required_change(self):
        with self.assertRaisesRegex(ScopeViolation, "Required task paths not changed"):
            self.validate(["agent-execution-notes.md"])

    def test_rejects_any_unexpected_repository_change(self):
        with self.assertRaisesRegex(ScopeViolation, "Unexpected changed files"):
            self.validate([REQUIRED, "README.md"])

    def test_rejects_execution_control_and_governance_changes(self):
        for path in ("AGENTS.md", ".ai/tasks/queue.json", ".github/workflows/other.yml", ".ai/policies/engineering.md"):
            with self.subTest(path=path):
                # Unexpected-path check blocks unlisted control files; hard-protected paths
                # are explicitly denied even if a malformed task attempts to require them.
                queue = json.loads(BASELINE.decode("utf-8"))
                queue["tasks"][0]["required_change_paths"] = [path]
                candidate = (json.dumps(queue, separators=(",", ":")) + "\n").encode("utf-8")
                with self.assertRaises(ScopeViolation):
                    validate_scope(TASK_ID, MODE, candidate, candidate, [path])

    def test_rejects_secret_like_and_ambiguous_paths(self):
        for path in (".env.production", "keys/private.pem", "folder/name\ncontinued"):
            with self.subTest(path=path):
                with self.assertRaises(ScopeViolation):
                    self.validate([path])

    def test_rejects_empty_changed_set(self):
        with self.assertRaisesRegex(ScopeViolation, "no changed files"):
            self.validate([])

    def make_git_baseline(self, root):
        (root / ".ai/tasks").mkdir(parents=True)
        (root / "AGENTS.md").write_text("canonical governance\\n", encoding="utf-8")
        (root / ".ai/tasks/queue.json").write_bytes(BASELINE)
        subprocess.run(["git", "init", "-q"], cwd=root, check=True)
        subprocess.run(["git", "config", "user.name", "Scope Test"], cwd=root, check=True)
        subprocess.run(["git", "config", "user.email", "scope-test@example.invalid"], cwd=root, check=True)
        subprocess.run(["git", "add", "AGENTS.md", ".ai/tasks/queue.json"], cwd=root, check=True)
        subprocess.run(["git", "commit", "-q", "-m", "baseline"], cwd=root, check=True)
        return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()

    def invoke_guard(self, root, baseline_sha):
        stdout, stderr = io.StringIO(), io.StringIO()
        argv = ["task_scope_guard.py", TASK_ID, MODE, baseline_sha]
        with patch.object(scope_guard, "ROOT", root), patch.object(sys, "argv", argv):
            with redirect_stdout(stdout), redirect_stderr(stderr):
                status = scope_guard.main()
        return status, stdout.getvalue(), stderr.getvalue()

    def test_git_integration_captures_untracked_required_and_generated_files(self):
        with tempfile.TemporaryDirectory(prefix="afx-scope-pass-") as temporary:
            root = Path(temporary)
            baseline_sha = self.make_git_baseline(root)
            candidates = [
                REQUIRED,
                "agent-execution-notes.md",
                "agent-execution-prompt.md",
                "agent-execution-report.md",
            ]
            for name in candidates:
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("candidate\\n", encoding="utf-8")

            status, stdout, stderr = self.invoke_guard(root, baseline_sha)
            self.assertEqual(status, 0, stderr)
            self.assertIn("TASK_SCOPE=PASS", stdout)
            self.assertEqual(
                (root / "changed-files.txt").read_text(encoding="utf-8").splitlines(),
                sorted(candidates),
            )

    def test_git_integration_fails_closed_on_queue_mutation(self):
        with tempfile.TemporaryDirectory(prefix="afx-scope-queue-") as temporary:
            root = Path(temporary)
            baseline_sha = self.make_git_baseline(root)
            (root / ".ai/tasks/queue.json").write_bytes(BASELINE + b" ")
            required = root / REQUIRED
            required.parent.mkdir(parents=True, exist_ok=True)
            required.write_text("candidate\\n", encoding="utf-8")

            status, stdout, stderr = self.invoke_guard(root, baseline_sha)
            self.assertEqual(status, 1)
            self.assertIn("TASK_SCOPE=BLOCKED", stderr)
            self.assertIn("queue must remain unchanged", stderr)
            self.assertFalse((root / "changed-files.txt").exists())

    def test_git_integration_rejects_unexpected_new_file(self):
        with tempfile.TemporaryDirectory(prefix="afx-scope-outside-") as temporary:
            root = Path(temporary)
            baseline_sha = self.make_git_baseline(root)
            required = root / REQUIRED
            required.parent.mkdir(parents=True, exist_ok=True)
            required.write_text("candidate\\n", encoding="utf-8")
            (root / "README.md").write_text("out of scope\\n", encoding="utf-8")

            status, stdout, stderr = self.invoke_guard(root, baseline_sha)
            self.assertEqual(status, 1)
            self.assertIn("TASK_SCOPE=BLOCKED", stderr)
            self.assertIn("Unexpected changed files outside required task paths", stderr)
            self.assertFalse((root / "changed-files.txt").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
