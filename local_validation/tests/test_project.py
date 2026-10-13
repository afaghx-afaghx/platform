from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
PROJECT_ROOT = Path(__file__).resolve().parents[1]

import validate_project


class CrewProjectTests(unittest.TestCase):
    def test_validation_workflow_is_isolated_per_pull_request(self):
        workflow_path = PROJECT_ROOT.parent / ".github" / "workflows" / "crewai-local-validation.yml"
        workflow = workflow_path.read_text(encoding="utf-8")
        self.assertIn("github.event.pull_request.number", workflow)
        self.assertIn("github.ref", workflow)
        self.assertIn("cancel-in-progress: false", workflow)

    def test_evidence_gate_includes_concurrency_policy(self):
        workflow_path = PROJECT_ROOT.parent / ".github" / "workflows" / "crewai-local-validation.yml"
        workflow = workflow_path.read_text(encoding="utf-8")
        self.assertIn("id: concurrency_policy", workflow)
        self.assertIn('"per_pr_concurrency_policy": os.getenv("CONCURRENCY_OUTCOME", "unknown")', workflow)
        if "required_checks = {" in workflow:
            required_checks = workflow.split("required_checks = {", 1)[1].split("}", 1)[0]
            self.assertIn('"per_pr_concurrency_policy",', required_checks)

    def test_manifest_gate_parses_only_bytes_matching_verified_digest(self):
        workflow_path = PROJECT_ROOT.parent / ".github" / "workflows" / "crewai-local-validation.yml"
        workflow = workflow_path.read_text(encoding="utf-8")
        self.assertIn("hashlib.sha256(evidence_bytes).hexdigest() != digest", workflow)
        self.assertIn('json.loads(evidence_bytes.decode("utf-8"))', workflow)

    def test_project_passes_structural_validation(self):
        result = validate_project.validate()
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["truth_state"], "TESTED")
        self.assertEqual(result["agents"], 4)
        self.assertEqual(result["tasks"], 4)
        self.assertEqual(result["paid_llm_execution"], "NOT_RUN")
        self.assertEqual(result["production_readiness"], "NOT_PROVEN")

    def test_each_task_has_required_output_and_valid_agent(self):
        root = Path(__file__).resolve().parents[1]
        crew = json.loads((root / "crew.jsonc").read_text(encoding="utf-8"))
        names = set(crew["agents"])
        task_names = set()
        for task in crew["tasks"]:
            self.assertTrue(task.get("expected_output", "").strip())
            self.assertIn(task.get("agent"), names)
            self.assertNotIn(task["name"], task_names)
            task_names.add(task["name"])

    def test_all_agents_use_the_only_approved_model(self):
        root = Path(__file__).resolve().parents[1]
        for name in ("architecture_auditor", "implementation_engineer", "test_engineer", "evidence_auditor"):
            agent = json.loads((root / "agents" / f"{name}.jsonc").read_text(encoding="utf-8"))
            self.assertEqual(agent["llm"], "openai/gpt-5.6-sol")
            self.assertFalse(agent["settings"]["allow_delegation"])


if __name__ == "__main__":
    unittest.main()
