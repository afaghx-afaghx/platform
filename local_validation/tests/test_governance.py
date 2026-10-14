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
    assert_canonical_repository,
    assert_no_secret_material,
    is_sensitive_path,
    is_production_config_path,
    require_write_approval,
    repository_root,
    resolve_read_target,
    require_write_path_allowlisted,
    validate_allowed_write_paths,
    validate_feature_branch,
    validate_relative_path,
    validate_test_id,
    validate_write_target,
    verify_evidence_manifest,
)


class GovernanceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self) -> None:
        self.tmp.cleanup()


    def test_repository_root_ignores_untrusted_environment_override(self):
        from subprocess import CompletedProcess

        redirected = self.root / "other-checkout"
        with patch.dict(os.environ, {"AFAGHX_REPO_ROOT": str(redirected)}):
            with patch(
                "governance.subprocess.run",
                return_value=CompletedProcess(
                    args=["git", "rev-parse", "--show-toplevel"],
                    returncode=0,
                    stdout=f"{self.root}{chr(10)}",
                    stderr="",
                ),
            ) as run:
                result = repository_root(self.root)
        self.assertEqual(result, self.root.resolve())
        self.assertEqual(Path(run.call_args.kwargs["cwd"]), self.root)

    def test_canonical_origin_accepts_only_approved_github_remotes(self):
        from subprocess import CompletedProcess

        approved = (
            "https://github.com/afaghx-afaghx/platform.git",
            "ssh://git@github.com/afaghx-afaghx/platform.git",
            "git@github.com:afaghx-afaghx/platform.git",
        )
        for remote in approved:
            with self.subTest(remote=remote), patch(
                "governance.subprocess.run",
                return_value=CompletedProcess(
                    args=["git", "remote", "get-url", "origin"],
                    returncode=0,
                    stdout=f"{remote}{chr(10)}",
                    stderr="",
                ),
            ):
                self.assertEqual(
                    assert_canonical_repository(self.root),
                    "afaghx-afaghx/platform",
                )

    def test_canonical_origin_rejects_forks_wrong_repositories_and_ambiguous_values(self):
        from subprocess import CompletedProcess

        rejected = (
            "https://github.com/some-fork/platform.git",
            "git@github.com:afaghx-afaghx/another-repo.git",
            "https://github.com/afaghx-afaghx/platform.git" + chr(10) + "https://github.com/some-fork/platform.git",
            "",
        )
        for remote in rejected:
            with self.subTest(remote=remote), patch(
                "governance.subprocess.run",
                return_value=CompletedProcess(
                    args=["git", "remote", "get-url", "origin"],
                    returncode=0,
                    stdout=remote,
                    stderr="",
                ),
            ), self.assertRaises(PolicyError):
                assert_canonical_repository(self.root)

    def test_canonical_origin_missing_fails_closed(self):
        import subprocess

        with patch(
            "governance.subprocess.run",
            side_effect=subprocess.CalledProcessError(2, ["git", "remote", "get-url", "origin"]),
        ), self.assertRaisesRegex(PolicyError, "canonical_origin_unavailable"):
            assert_canonical_repository(self.root)

    def test_path_traversal_is_rejected(self):
        for value in ("../AGENTS.md", "platform/../../AGENTS.md", "/etc/passwd", r"..\secret.txt"):
            with self.subTest(value=value), self.assertRaises(PolicyError):
                validate_relative_path(value)

    def test_excluded_directory_checks_are_case_insensitive(self):
        for value in (".GIT/config", ".VENV/lib/private.txt", "Node_Modules/package/index.js"):
            with self.subTest(value=value):
                self.assertTrue(is_sensitive_path(PurePosixPath(value)))

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

    def test_production_config_classifier_catches_config_filenames_without_blocking_live_code(self):
        self.assertTrue(is_production_config_path(PurePosixPath("platform/config/production.yaml")))
        self.assertTrue(is_production_config_path(PurePosixPath("resources/api.production.yml")))
        self.assertFalse(is_production_config_path(PurePosixPath("experience/components/live-indicator.mjs")))

    def test_nested_migration_and_operational_paths_are_not_writable(self):
        for value in (
            "platform/migrations/001-add-session.js",
            "core/migration/0001-add-membership.py",
            "scripts/deploy-production.mjs",
            "scripts/publish-release.mjs",
            "packages/db-migrate/index.ts",
        ):
            with self.subTest(value=value), self.assertRaisesRegex(
                PolicyError, "protected_operational_path_write_denied"
            ):
                validate_write_target(self.root, value)
            with self.subTest(allowlist=value), self.assertRaises(PolicyError):
                validate_allowed_write_paths(self.root, [value])

    def test_only_source_code_extensions_are_writable(self):
        for value in ("experience/README.md", "platform/notes.txt", "packages/runtime.json5"):
            with self.subTest(value=value), self.assertRaisesRegex(
                PolicyError, "source_file_extension_not_allowlisted"
            ):
                validate_write_target(self.root, value)
        self.assertEqual(
            validate_write_target(self.root, "experience/example.mjs"),
            self.root / "experience" / "example.mjs",
        )

    def test_production_configuration_paths_are_denied(self):

        paths = (
            "platform/config/production.yaml",
            "resources/config/prod.json",
            "platform/api.production.yml",
            "platform/production/runtime.json",
            "platform/config/production/settings.yaml",
            "platform/config/runtime.yaml",
            "platform/config.json",
            "resources/settings.json",
            "platform/runtime-config.toml",
            "platform/runtime.json",
            "resources/deployment.yml",
        )
        for value in paths:
            with self.subTest(value=value), self.assertRaisesRegex(
                PolicyError, "production_config_write_denied"
            ):
                validate_write_target(self.root, value)
            with self.subTest(allowlist=value), self.assertRaisesRegex(
                PolicyError, "production_config_write_denied"
            ):
                validate_allowed_write_paths(self.root, [value])

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

    def test_write_requires_exact_task_path_allowlist(self):
        allowed = validate_allowed_write_paths(self.root, ["experience/example.mjs"])
        self.assertEqual(allowed, ["experience/example.mjs"])
        self.assertEqual(
            require_write_path_allowlisted("experience/example.mjs", allowed),
            "experience/example.mjs",
        )
        with self.assertRaises(PolicyError):
            require_write_path_allowlisted("experience/other.mjs", allowed)
        with self.assertRaises(PolicyError):
            validate_allowed_write_paths(self.root, [])
        with self.assertRaises(PolicyError):
            validate_allowed_write_paths(self.root, [".github/workflows/build.yml"])
        with self.assertRaises(PolicyError):
            validate_allowed_write_paths(self.root, ["experience//example.mjs"])


    def test_internal_symlinks_cannot_redirect_reads_or_writes(self):
        source_dir = self.root / "experience"
        source_dir.mkdir()
        original = source_dir / "source.mjs"
        original.write_text("safe", encoding="utf-8")
        alias = source_dir / "alias.mjs"
        try:
            alias.symlink_to(original)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f"symlinks are unavailable: {exc}")
        with self.assertRaisesRegex(PolicyError, "symlink_path_denied"):
            resolve_read_target(self.root, "experience/alias.mjs")
        with self.assertRaisesRegex(PolicyError, "symlink_path_denied"):
            validate_write_target(self.root, "experience/alias.mjs")

    def test_symlink_to_sensitive_file_is_denied_even_when_alias_looks_safe(self):
        source_dir = self.root / "experience"
        source_dir.mkdir()
        secret = self.root / ".env"
        secret.write_text("NOT_A_REAL_SECRET", encoding="utf-8")
        alias = source_dir / "public.mjs"
        try:
            alias.symlink_to(secret)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f"symlinks are unavailable: {exc}")
        with self.assertRaisesRegex(PolicyError, "symlink_path_denied"):
            resolve_read_target(self.root, "experience/public.mjs")

    def _write_valid_manifest(self):
        evidence = self.root / "crewai-validation-evidence.json"
        payload = b'{"status":"PASS"}\n'
        evidence.write_bytes(payload)
        import hashlib
        manifest = self.root / "SHA256SUMS"
        digest = hashlib.sha256(payload).hexdigest()
        manifest.write_text(f"{digest}  {evidence.name}\n", encoding="utf-8")
        return evidence, manifest, digest

    def test_evidence_manifest_rejects_symlinked_parent_directory(self):
        real_dir = self.root / "real-output"
        real_dir.mkdir()
        evidence = real_dir / "crewai-validation-evidence.json"
        payload = b'{"status":"PASS"}\n'
        evidence.write_bytes(payload)
        import hashlib
        manifest = real_dir / "SHA256SUMS"
        manifest.write_text(
            f"{hashlib.sha256(payload).hexdigest()}  {evidence.name}\n",
            encoding="utf-8",
        )
        linked_dir = self.root / "output"
        try:
            linked_dir.symlink_to(real_dir, target_is_directory=True)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f"symlink directories are unavailable: {exc}")
        with self.assertRaisesRegex(PolicyError, "evidence_manifest_symlink_denied"):
            verify_evidence_manifest(
                linked_dir / "crewai-validation-evidence.json",
                linked_dir / "SHA256SUMS",
            )

    def test_evidence_manifest_accepts_exact_filename_and_hash(self):
        evidence, manifest, digest = self._write_valid_manifest()
        self.assertEqual(verify_evidence_manifest(evidence, manifest), digest)

    def test_evidence_manifest_rejects_filename_mismatch(self):
        evidence, manifest, digest = self._write_valid_manifest()
        manifest.write_text(f"{digest}  other-evidence.json\n", encoding="utf-8")
        with self.assertRaisesRegex(PolicyError, "manifest_filename_mismatch"):
            verify_evidence_manifest(evidence, manifest)

    def test_evidence_manifest_rejects_malformed_or_multiple_entries(self):
        evidence, manifest, _ = self._write_valid_manifest()
        payloads = (
            "not-a-valid-manifest\n",
            "a" * 64 + "  " + evidence.name + "\n" + "b" * 64 + "  second.json\n",
        )
        for payload in payloads:
            with self.subTest(payload=payload), self.assertRaises(PolicyError):
                manifest.write_text(payload, encoding="utf-8")
                verify_evidence_manifest(evidence, manifest)

    def test_evidence_manifest_rejects_hash_mismatch(self):
        evidence, manifest, _ = self._write_valid_manifest()
        evidence.write_text('{"status":"FAIL"}\n', encoding="utf-8")
        with self.assertRaisesRegex(PolicyError, "evidence_hash_mismatch"):
            verify_evidence_manifest(evidence, manifest)

    def test_evidence_manifest_fails_closed_when_files_are_missing(self):
        evidence, manifest, _ = self._write_valid_manifest()
        evidence.unlink()
        with self.assertRaisesRegex(PolicyError, "evidence_or_manifest_missing"):
            verify_evidence_manifest(evidence, manifest)
        evidence.write_text("{}\n", encoding="utf-8")
        manifest.unlink()
        with self.assertRaisesRegex(PolicyError, "evidence_or_manifest_missing"):
            verify_evidence_manifest(evidence, manifest)

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
