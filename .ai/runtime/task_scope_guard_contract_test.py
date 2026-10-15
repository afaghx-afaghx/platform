#!/usr/bin/env python3
"""Adversarial unit tests for the AFAGHX task-scope boundary."""
import json
import unittest

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
        for path in (REQUIRED, ".env.production", "keys/private.pem", "folder/name\ncontinued"):
            with self.subTest(path=path):
                with self.assertRaises(ScopeViolation):
                    self.validate([path])

    def test_rejects_empty_changed_set(self):
        with self.assertRaisesRegex(ScopeViolation, "no changed files"):
            self.validate([])


if __name__ == "__main__":
    unittest.main(verbosity=2)
