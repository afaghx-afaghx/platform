from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path, PurePosixPath
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from governance import (
    PolicyError,
    assert_no_secret_material,
    is_sensitive_path,
    require_write_approval,
    validate_feature_branch,
    validate_relative_path,
    validate_test_id,
    validate_write_target,
)


class GovernanceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_path_traversal_is_rejected(self):
        for value in ("../AGENTS.md", "platform/../../AGENTS.md", "/etc/passwd", r"..\secret.txt"):
            with self.subTest(value=value), self.assertRaises(PolicyError):
                validate_relative_path(value)

    def test_secret_paths_are_not_readable(self):
        for value in (".env", ".env.production", "config/private.pem", "secrets/db.key", ".git/config"):
            with self.subTest(value=value):
                self.assertTrue(is_sensitive_path(PurePosixPath(value)))

    def test_agents_constitution_is_readable_but_not_writable(self):
        self.assertFalse(is_sensitive_path(PurePosixPath("AGENTS.md")))
        with self.assertRaises(PolicyError):
            validate_write_target(self.root, "AGENTS.md")

    def test_writes_require_allowlisted_source_root(self):
        self.assertEqual(
            validate_write_target(self.root, "experience/example.mjs"),
            self.root / "experience" / "example.mjs",
        )
        for value in (
            ".ai/policies/engineering.md",
            ".github/workflows/build.yml",
            "infrastructure/deploy.yml",
            "database/migrations/001.sql",
            "local_validation/crew.jsonc",
            "docs/architecture.md",
        ):
            with self.subTest(value=value), self.assertRaises(PolicyError):
                validate_write_target(self.root, value)

    def test_symlink_escape_is_rejected(self):
        with tempfile.TemporaryDirectory() as outside_dir:
            outside = Path(outside_dir) / "outside-file"
            outside.write_text("do not read", encoding="utf-8")
            link = self.root / "experience"
            link.mkdir()
            try:
                (link / "escape.mjs").symlink_to(outside)
            except (OSError, NotImplementedError) as exc:
                self.skipTest(f"symlinks are not available in this environment: {exc}")
            with self.assertRaises(PolicyError):
                validate_write_target(self.root, "experience/escape.mjs")

    def test_main_and_unknown_branches_are_denied(self):
        for branch in ("main", "master", "develop", "release/v1", "work/my-task", ""):
            with self.subTest(branch=branch), self.assertRaises(PolicyError):
                validate_feature_branch(branch)
        self.assertEqual(validate_feature_branch("feat/example-task"), "feat/example-task")
        self.assertEqual(validate_feature_branch("ai/fix-session-check"), "ai/fix-session-check")

    def test_write_requires_explicit_opt_in(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(PolicyError):
                require_write_approval()
        with patch.dict(os.environ, {"AFAGHX_WRITE_ENABLED": "1"}):
            require_write_approval()

    def test_secret_material_is_rejected(self):
        with self.assertRaises(PolicyError):
            assert_no_secret_material("token = sk-" + "A" * 32)
        assert_no_secret_material("OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')")

    def test_test_command_id_must_be_allowlisted(self):
        self.assertEqual(validate_test_id("crew_tests", {"crew_tests", "core_security"}), "crew_tests")
        with self.assertRaises(PolicyError):
            validate_test_id("bash -c 'rm -rf .'", {"crew_tests", "core_security"})


if __name__ == "__main__":
    unittest.main()
