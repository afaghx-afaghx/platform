from __future__ import annotations

import json
import os
import sys
import tempfile
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

    def test_source_writer_rejects_parent_symlink_created_after_precheck(self):
        import source_write

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "repo"
            root.mkdir()
            source_dir = root / "experience"
            source_dir.mkdir()
            external_dir = Path(temp) / "external"
            external_dir.mkdir()
            real_validate = source_write.validate_write_target

            def change_parent_after_initial_check(check_root, raw_path):
                result = real_validate(check_root, raw_path)
                if not hasattr(change_parent_after_initial_check, "injected"):
                    source_dir.rename(root / "experience-real")
                    source_dir.symlink_to(external_dir, target_is_directory=True)
                    change_parent_after_initial_check.injected = True
                return result

            env = {
                "AFAGHX_WRITE_ENABLED": "1",
                "AFAGHX_ALLOWED_WRITE_PATHS": '["experience/newfile.mjs"]',
            }
            with patch.dict(os.environ, env, clear=True), \
                 patch.object(source_write, "repository_root", return_value=root), \
                 patch.object(source_write, "assert_canonical_repository", return_value="afaghx-afaghx/platform"), \
                 patch.object(source_write, "current_branch", return_value="feat/test-write"), \
                 patch.object(source_write, "validate_write_target", side_effect=change_parent_after_initial_check):
                result = SourceWriteTool()._run("experience/newfile.mjs", "export const safe = true;")

            self.assertIn("WRITE_DENIED", result)
            self.assertIn("symlink_path_denied", result)
            self.assertFalse((external_dir / "newfile.mjs").exists())

    def test_source_writer_atomically_replaces_a_last_moment_symlink(self):
        import source_write

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source_dir = root / "experience"
            source_dir.mkdir()
            external = root / "external.mjs"
            external.write_text("external content", encoding="utf-8")
            destination = source_dir / "newfile.mjs"

            real_replace = source_write.os.replace

            def insert_symlink_immediately_before_replace(source, target):
                destination.symlink_to(external)
                return real_replace(source, target)

            env = {
                "AFAGHX_WRITE_ENABLED": "1",
                "AFAGHX_ALLOWED_WRITE_PATHS": '["experience/newfile.mjs"]',
            }
            with patch.dict(os.environ, env, clear=True), \
                 patch.object(source_write, "repository_root", return_value=root), \
                 patch.object(source_write, "assert_canonical_repository", return_value="afaghx-afaghx/platform"), \
                 patch.object(source_write, "current_branch", return_value="feat/test-write"), \
                 patch.object(source_write.os, "replace", side_effect=insert_symlink_immediately_before_replace):
                result = SourceWriteTool()._run("experience/newfile.mjs", "export const safe = true;")

            self.assertIn("WRITE_SUCCESS", result)
            self.assertEqual(external.read_text(encoding="utf-8"), "external content")
            self.assertFalse(destination.is_symlink())
            self.assertEqual(destination.read_text(encoding="utf-8"), "export const safe = true;")

    def test_source_writer_rejects_noncanonical_repository_before_creating_paths(self):
        import source_write
        from governance import PolicyError

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "repo"
            root.mkdir()
            env = {
                "AFAGHX_WRITE_ENABLED": "1",
                "AFAGHX_ALLOWED_WRITE_PATHS": '["experience/newfile.mjs"]',
            }
            with patch.dict(os.environ, env, clear=True), \
                 patch.object(source_write, "repository_root", return_value=root), \
                 patch.object(
                     source_write,
                     "assert_canonical_repository",
                     side_effect=PolicyError("canonical_origin_mismatch"),
                 ):
                result = SourceWriteTool()._run("experience/newfile.mjs", "export const safe = true;")

            self.assertIn("WRITE_DENIED", result)
            self.assertIn("canonical_origin_mismatch", result)
            self.assertFalse((root / "experience").exists())

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

    def test_verification_task_only_mentions_exposed_test_ids(self):
        crew = json.loads((PROJECT_ROOT / "crew.jsonc").read_text(encoding="utf-8"))
        verification = next(task for task in crew["tasks"] if task["name"] == "verification_task")
        description = verification["description"]
        for allowed_id in TEST_COMMANDS:
            with self.subTest(allowed_id=allowed_id):
                self.assertIn(allowed_id, description)
        for removed_id in ("gateway_runtime", "core_security", "agent_contract"):
            with self.subTest(removed_id=removed_id):
                self.assertNotIn(removed_id, description)

    def test_repository_search_never_reads_internal_symlink_files(self):
        import repository_search

        with tempfile.TemporaryDirectory() as temp:
            temp_root = Path(temp)
            root = temp_root / "repo"
            root.mkdir()
            source = root / "experience"
            source.mkdir()
            target = temp_root / "external-target.mjs"
            target.write_text("EXCLUSIVE_INTERNAL_SYMLINK_MARKER", encoding="utf-8")
            alias = source / "alias.mjs"
            try:
                alias.symlink_to(target)
            except (OSError, NotImplementedError) as exc:
                self.skipTest(f"symlinks unavailable: {exc}")

            with patch.object(repository_search, "repository_root", return_value=root):
                result = RepositorySearchTool()._run(
                    "EXCLUSIVE_INTERNAL_SYMLINK_MARKER", scope="."
                )
            self.assertIn("No matches", result)
            self.assertNotIn("EXCLUSIVE_INTERNAL_SYMLINK_MARKER", result)

    def test_repository_package_scripts_are_not_agent_callable(self):
        for test_id in ("gateway_runtime", "core_security", "agent_contract", "npm run test"):
            with self.subTest(test_id=test_id):
                result = RunGovernedTestTool()._run(test_id)
                self.assertIn("test_id_not_allowlisted", result)
                self.assertNotIn("TEST_PASS", result)


if __name__ == "__main__":
    unittest.main()
