from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import validate_project


class CrewProjectTests(unittest.TestCase):
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
