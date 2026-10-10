from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from main import EXPECTED_MODEL, build_crew


class RuntimeAssemblyTests(unittest.TestCase):
    def test_runtime_builds_real_crew_without_calling_provider(self):
        crew, agents, tasks = build_crew()
        self.assertEqual(len(agents), 4)
        self.assertEqual(len(tasks), 4)
        self.assertEqual(crew.process.value, "sequential")
        self.assertTrue(all(agent.llm is not None for agent in agents.values()))
        self.assertTrue(all(task.agent in agents.values() for task in tasks))
        self.assertTrue(all(agent.allow_delegation is False for agent in agents.values()))
        self.assertEqual(
            {getattr(agent.llm, "model", EXPECTED_MODEL) for agent in agents.values()},
            {EXPECTED_MODEL},
        )

    def test_task_context_is_wired_only_to_prior_tasks(self):
        _, _, tasks = build_crew()
        self.assertEqual(len(tasks[0].context or []), 0)
        self.assertEqual(len(tasks[1].context or []), 1)
        self.assertEqual(len(tasks[2].context or []), 2)
        self.assertEqual(len(tasks[3].context or []), 3)


if __name__ == "__main__":
    unittest.main()
