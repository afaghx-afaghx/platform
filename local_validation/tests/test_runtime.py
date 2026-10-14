from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from governance import PolicyError
from main import (EXPECTED_MODEL, build_crew, ensure_output_dir, _atomic_write_output,
                  parse_evidence_audit_decision, candidate_run_passed)


class RuntimeAssemblyTests(unittest.TestCase):
    def test_runtime_builds_real_crew_without_calling_provider(self):
        crew, agents, tasks = build_crew()
        self.assertEqual(len(agents), 4)
        self.assertEqual(len(tasks), 4)
        self.assertEqual(crew.process.value, "sequential")
        self.assertTrue(all(agent.llm is not None for agent in agents.values()))
        self.assertTrue(all(task.agent in agents.values() for task in tasks))
        self.assertTrue(all(agent.allow_delegation is False for agent in agents.values()))
        # CrewAI normalizes "openai/<model>" into the provider-specific model ID
        # on its LLM object; validate the configured provider and model separately.
        self.assertEqual(
            {getattr(agent.llm, "model", "").removeprefix("openai/") for agent in agents.values()},
            {EXPECTED_MODEL.split("/", 1)[1]},
        )

    def test_output_directory_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            real_output = root / "real-output"
            real_output.mkdir()
            output_link = root / "output"
            try:
                output_link.symlink_to(real_output, target_is_directory=True)
            except (OSError, NotImplementedError) as exc:
                self.skipTest(f"symlink directories are unavailable: {exc}")
            with patch("main.PROJECT_ROOT", root), patch("main.OUTPUT_DIR", output_link):
                with self.assertRaisesRegex(PolicyError, "output_directory_symlink_denied"):
                    ensure_output_dir()

    def test_atomic_output_replaces_symlink_without_modifying_external_target(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output_dir = root / "output"
            output_dir.mkdir()
            external = root / "external.txt"
            external.write_text("keep this unchanged", encoding="utf-8")
            target = output_dir / "crewai-run-evidence.json"
            try:
                target.symlink_to(external)
            except (OSError, NotImplementedError) as exc:
                self.skipTest(f"symlinks are unavailable: {exc}")
            with patch("main.PROJECT_ROOT", root), patch("main.OUTPUT_DIR", output_dir):
                _atomic_write_output("crewai-run-evidence.json", b"safe report")
            self.assertEqual(external.read_text(encoding="utf-8"), "keep this unchanged")
            self.assertFalse(target.is_symlink())
            self.assertEqual(target.read_bytes(), b"safe report")

    def test_evidence_audit_decision_requires_one_exact_machine_marker(self):
        self.assertEqual(
            parse_evidence_audit_decision("Review passed.\nAFX_CANDIDATE_DECISION: PASS\n"),
            "PASS",
        )
        self.assertEqual(
            parse_evidence_audit_decision("AFX_CANDIDATE_DECISION: BLOCKED\n"),
            "BLOCKED",
        )
        self.assertEqual(parse_evidence_audit_decision("review passed without marker"), "MISSING_OR_AMBIGUOUS")
        self.assertEqual(
            parse_evidence_audit_decision(
                "AFX_CANDIDATE_DECISION: PASS\nAFX_CANDIDATE_DECISION: PASS\n"
            ),
            "MISSING_OR_AMBIGUOUS",
        )
        self.assertEqual(
            parse_evidence_audit_decision("AFX_CANDIDATE_DECISION: MAYBE\n"),
            "MISSING_OR_AMBIGUOUS",
        )

    def test_candidate_run_gate_cannot_pass_without_explicit_auditor_pass(self):
        common = {
            "model_execution": "SUCCESS",
            "changed_paths_valid": True,
            "diff_check_status": "PASS",
            "whitespace_findings": [],
            "tests_pass": True,
            "final_gate_exists": True,
        }
        self.assertTrue(candidate_run_passed(**common, evidence_audit_decision="PASS"))
        for decision in ("BLOCKED", "MISSING_OR_AMBIGUOUS"):
            with self.subTest(decision=decision):
                self.assertFalse(candidate_run_passed(**common, evidence_audit_decision=decision))
        self.assertFalse(candidate_run_passed(
            **{**common, "tests_pass": False}, evidence_audit_decision="PASS"
        ))

    def test_task_context_is_wired_only_to_prior_tasks(self):
        _, _, tasks = build_crew()
        self.assertEqual(len(tasks[0].context or []), 0)
        self.assertEqual(len(tasks[1].context or []), 1)
        self.assertEqual(len(tasks[2].context or []), 2)
        self.assertEqual(len(tasks[3].context or []), 3)


if __name__ == "__main__":
    unittest.main()
