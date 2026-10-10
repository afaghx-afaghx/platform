from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "tools"))

from repository_read import RepositoryReadTool
from repository_search import RepositorySearchTool
from source_write import SourceWriteTool
from run_governed_test import RunGovernedTestTool, TEST_COMMANDS


class ToolContractTests(unittest.TestCase):
    def test_four_custom_tool_classes_load_without_a_provider_call(self):
        self.assertEqual(RepositoryReadTool().name, "repository_read")
        self.assertEqual(RepositorySearchTool().name, "repository_search")
        self.assertEqual(SourceWriteTool().name, "source_write")
        self.assertEqual(RunGovernedTestTool().name, "run_governed_test")

    def test_writer_fails_closed_before_any_git_or_filesystem_mutation(self):
        with patch.dict(os.environ, {}, clear=True):
            result = SourceWriteTool()._run("experience/should-not-exist.mjs", "export const value = 1;")
        self.assertIn("write_disabled", result)

    def test_arbitrary_commands_cannot_be_passed_to_test_runner(self):
        result = RunGovernedTestTool()._run("bash -c 'cat .env'")
        self.assertIn("test_id_not_allowlisted", result)
        self.assertNotIn("TEST_PASS", result)

    def test_allowlist_commands_are_fixed_and_no_shell_is_used(self):
        self.assertEqual(set(TEST_COMMANDS), {
            "crew_contract", "crew_tests", "gateway_runtime", "core_security", "agent_contract"
        })
        self.assertTrue(all(isinstance(command, list) for command in TEST_COMMANDS.values()))
        self.assertTrue(all(command[0] != "bash" for command in TEST_COMMANDS.values()))


if __name__ == "__main__":
    unittest.main()
