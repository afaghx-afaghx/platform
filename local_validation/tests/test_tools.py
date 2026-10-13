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
from run_governed_test import (
    RunGovernedTestTool,
    TEST_COMMANDS,
    clear_test_evidence,
    get_test_evidence,
    sanitized_test_environment,
)


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

    def test_test_subprocess_does_not_inherit_credentials_or_write_opt_in(self):
        source = {
            "PATH": "/usr/bin",
            "HOME": "/tmp/home",
            "OPENAI_API_KEY": "must-not-be-passed",
            "GITHUB_TOKEN": "must-not-be-passed",
            "AWS_SECRET_ACCESS_KEY": "must-not-be-passed",
            "AFAGHX_WRITE_ENABLED": "1",
            "AFAGHX_DEPLOY_SSH_PRIVATE_KEY": "must-not-be-passed",
        }
        actual = sanitized_test_environment(source)
        self.assertEqual(actual["PATH"], "/usr/bin")
        self.assertEqual(actual["HOME"], "/tmp/home")
        self.assertEqual(actual["PYTHONDONTWRITEBYTECODE"], "1")
        for name in (
            "OPENAI_API_KEY",
            "GITHUB_TOKEN",
            "AWS_SECRET_ACCESS_KEY",
            "AFAGHX_WRITE_ENABLED",
            "AFAGHX_DEPLOY_SSH_PRIVATE_KEY",
        ):
            with self.subTest(name=name):
                self.assertNotIn(name, actual)

    def test_test_evidence_collector_resets_without_retaining_old_runs(self):
        clear_test_evidence()
        self.assertEqual(get_test_evidence(), [])

    def test_arbitrary_commands_cannot_be_passed_to_test_runner(self):
        result = RunGovernedTestTool()._run("bash -c 'cat .env'")
        self.assertIn("test_id_not_allowlisted", result)
        self.assertNotIn("TEST_PASS", result)

    def test_only_protected_local_validation_commands_are_agent_callable(self):
        self.assertEqual(set(TEST_COMMANDS), {"crew_contract", "crew_tests"})
        self.assertEqual(TEST_COMMANDS["crew_contract"], [sys.executable, "local_validation/validate_project.py"])
        self.assertEqual(TEST_COMMANDS["crew_tests"], [
            sys.executable, "-m", "unittest", "discover", "-s", "local_validation/tests", "-v"
        ])
        self.assertTrue(all(isinstance(command, list) for command in TEST_COMMANDS.values()))
        self.assertTrue(all(command[0] == sys.executable for command in TEST_COMMANDS.values()))

    def test_repository_package_scripts_are_not_agent_callable(self):
        for test_id in ("gateway_runtime", "core_security", "agent_contract", "npm run test"):
            with self.subTest(test_id=test_id):
                result = RunGovernedTestTool()._run(test_id)
                self.assertIn("test_id_not_allowlisted", result)
                self.assertNotIn("TEST_PASS", result)


if __name__ == "__main__":
    unittest.main()
