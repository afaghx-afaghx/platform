"""Fail-closed local repository policy for the AFAGHX CrewAI assistant."""
from __future__ import annotations

import hashlib
import os
import re
import subprocess
from pathlib import Path, PurePosixPath
from typing import Iterable


class PolicyError(ValueError):
    """Raised when a repository operation violates local policy."""


ALLOWED_WRITE_ROOTS = {
    "core", "platform", "domains", "intelligence", "experience",
    "tests", "packages", "scripts", "routes", "resources",
}
PROTECTED_ROOTS = {".ai", ".github", "infrastructure", "database", "docs", "local_validation"}
PROTECTED_FILES = {
    ".env", ".env.local", ".env.production", "id_rsa", "id_ed25519",
    "credentials.json",
}
EXCLUDED_DIRS = {
    ".git", ".venv", "venv", "node_modules", "dist", "build",
    "coverage", ".crewai", "__pycache__",
}
_SECRET_VALUE_PATTERNS = (
    re.compile(r"-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----", re.I),
    re.compile(r"\bsk-[A-Za-z0-9]{24,}\b"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"),
    re.compile(r"\bgithub_pat_[A-Za-z0-9_]{30,}\b"),
    re.compile(r"(?im)^\s*(?:OPENAI_API_KEY|AFAGHX_DEPLOY_SSH_PRIVATE_KEY|AFAGHX_PRODUCTION_DATABASE_URL)\s*=\s*(?!\s*$|#|your_|replace_me|<|os\.environ|os\.getenv|process\.env|env\.get)[^\s#]{12,}\s*$"),
)
ALLOWED_BRANCH_PREFIXES = ("ai/", "feat/", "fix/", "crewai/", "codex/")
ALLOWED_SOURCE_EXTENSIONS = {
    ".c", ".cc", ".cpp", ".cs", ".css", ".dart", ".go", ".h", ".hpp",
    ".java", ".js", ".jsx", ".kt", ".mjs", ".cjs", ".php", ".py", ".rb",
    ".rs", ".scss", ".swift", ".ts", ".tsx", ".vue", ".svelte", ".html",
}


CANONICAL_REPOSITORY = "afaghx-afaghx/platform"


def repository_root(start: str | Path | None = None) -> Path:
    # Resolve from the caller's actual checkout. Do not honor an environment
    # variable that can silently redirect tools to a different worktree.
    candidate = Path(start or Path.cwd()).expanduser()
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=candidate, text=True, capture_output=True, check=True, timeout=10,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise PolicyError("repository_root_unavailable: run inside a Git checkout") from exc
    return Path(result.stdout.strip()).resolve()


def assert_canonical_repository(root: str | Path) -> str:
    """Fail closed unless origin is the one approved AFAGHX platform repository."""
    try:
        result = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            cwd=Path(root).resolve(),
            text=True,
            capture_output=True,
            check=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise PolicyError("canonical_origin_unavailable") from exc

    remote = result.stdout.strip()
    allowed = re.fullmatch(
        r"(?:https://github\\.com/|ssh://git@github\\.com/|git@github\\.com:)afaghx-afaghx/platform(?:\\.git)?",
        remote,
        flags=re.IGNORECASE,
    )
    if not allowed or "\\n" in remote or "\\r" in remote:
        raise PolicyError("canonical_origin_mismatch")
    return CANONICAL_REPOSITORY


def validate_relative_path(raw_path: str) -> PurePosixPath:
    if not isinstance(raw_path, str) or not raw_path.strip():
        raise PolicyError("path_required")
    if "\x00" in raw_path or "\\" in raw_path:
        raise PolicyError("invalid_path_format: use repository-relative POSIX paths")
    path = PurePosixPath(raw_path)
    if raw_path == ".":
        return path
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise PolicyError("path_must_be_relative_without_traversal")
    if path.parts and re.match(r"^[A-Za-z]:", path.parts[0]):
        raise PolicyError("absolute_windows_path_denied")
    return path


def is_sensitive_path(path: PurePosixPath) -> bool:
    excluded_dirs = {part.lower() for part in EXCLUDED_DIRS}
    if any(part.lower() in excluded_dirs for part in path.parts):
        return True
    lower_parts = tuple(part.lower() for part in path.parts)
    name = path.name.lower()
    if name in {x.lower() for x in PROTECTED_FILES}:
        return True
    if name.startswith(".env") and name != ".env.example":
        return True
    if any(part in {"secret", "secrets", "credentials", "private"} for part in lower_parts):
        return True
    if name.endswith((".pem", ".key", ".p12", ".pfx", ".keystore", ".tfstate", ".sqlite", ".db")):
        return True
    if name in {"id_rsa", "id_ed25519", "known_hosts_private"}:
        return True
    return False


_PRODUCTION_CONFIG_MARKERS = {"prod", "production", "prod-config", "production-config", "live-config"}
_CONFIG_FILENAME_MARKERS = {"config", "configuration", "settings", "appsettings", "runtime-config", "deploy-config"}
_CONFIG_FILE_EXTENSIONS = {
    ".cfg", ".conf", ".env", ".ini", ".json", ".properties", ".toml", ".yaml", ".yml",
}


def is_production_config_path(path: PurePosixPath) -> bool:
    """Treat unclassified configuration-bearing paths as potentially production and deny them."""
    parts = tuple(part.lower() for part in path.parts)

    # Any file under an explicitly production-marked directory is protected.
    if any(part in _PRODUCTION_CONFIG_MARKERS for part in parts[:-1]):
        return True

    # Fail closed for configuration-bearing formats anywhere in approved roots.
    # Path names alone cannot prove that a JSON/YAML/TOML file is non-production.
    if path.suffix.lower() in _CONFIG_FILE_EXTENSIONS:
        return True

    # Also deny conventionally named configuration source files (for example config.ts).
    filename_tokens = set(re.split(r"[._-]+", path.stem.lower()))
    if filename_tokens & (_PRODUCTION_CONFIG_MARKERS | _CONFIG_FILENAME_MARKERS):
        return True

    return False


def _reject_symlink_components(root: Path, relative: PurePosixPath) -> None:
    """Reject symlinks in every existing path component before resolving a target."""
    candidate = root
    for part in relative.parts:
        candidate = candidate / part
        if candidate.is_symlink():
            raise PolicyError("symlink_path_denied")


def _reject_symlink_path_components(path: Path) -> None:
    """Reject symlinks in every existing component of an evidence/manifest path."""
    if ".." in path.parts:
        raise PolicyError("evidence_manifest_path_traversal_denied")
    if path.is_absolute():
        current = Path(path.anchor)
        parts = path.parts[1:]
    else:
        current = Path.cwd()
        parts = path.parts
    for part in parts:
        if part in {"", "."}:
            continue
        current = current / part
        if current.is_symlink():
            raise PolicyError("evidence_manifest_symlink_denied")


def resolve_read_target(root: Path, raw_path: str) -> Path:
    rel = validate_relative_path(raw_path)
    if is_sensitive_path(rel):
        raise PolicyError("sensitive_path_read_denied")
    root = root.resolve()
    _reject_symlink_components(root, rel)
    target = (root / Path(*rel.parts)).resolve()
    if target != root and root not in target.parents:
        raise PolicyError("path_escape_denied")
    # Recheck the canonical destination, not just the caller-supplied spelling.
    try:
        canonical_rel = PurePosixPath(target.relative_to(root).as_posix())
    except ValueError as exc:
        raise PolicyError("path_escape_denied") from exc
    if is_sensitive_path(canonical_rel):
        raise PolicyError("sensitive_path_read_denied")
    if not target.exists():
        raise PolicyError("path_not_found")
    if not (target.is_file() or target.is_dir()):
        raise PolicyError("unsupported_path_type")
    return target


def validate_write_target(root: Path, raw_path: str) -> Path:
    rel = validate_relative_path(raw_path)
    if not rel.parts:
        raise PolicyError("path_required")
    top = rel.parts[0]
    if is_production_config_path(rel):
        raise PolicyError("production_config_write_denied")
    if rel.suffix.lower() not in ALLOWED_SOURCE_EXTENSIONS:
        raise PolicyError("source_file_extension_not_allowlisted")
    if top not in ALLOWED_WRITE_ROOTS:
        raise PolicyError("write_root_not_allowlisted")
    if top in PROTECTED_ROOTS or is_sensitive_path(rel):
        raise PolicyError("protected_path_write_denied")
    if any(part.startswith(".") for part in rel.parts):
        raise PolicyError("hidden_path_write_denied")
    if rel.name.lower() == "agents.md" or rel.name.lower() in {x.lower() for x in PROTECTED_FILES}:
        raise PolicyError("protected_file_write_denied")
    root = root.resolve()
    _reject_symlink_components(root, rel)
    target = (root / Path(*rel.parts)).resolve()
    if target != root and root not in target.parents:
        raise PolicyError("path_escape_denied")
    if target.exists() and not target.is_file():
        raise PolicyError("target_is_not_file")
    return target


def validate_allowed_write_paths(root: Path, raw_paths: Iterable[str]) -> list[str]:
    """Validate and canonicalize the exact file paths approved for one task."""
    paths = list(raw_paths) if raw_paths is not None else []
    if not paths:
        raise PolicyError("write_path_allowlist_missing")
    normalized: list[str] = []
    for raw_path in paths:
        if not isinstance(raw_path, str):
            raise PolicyError("write_path_allowlist_entries_must_be_strings")
        relative = validate_relative_path(raw_path)
        canonical = relative.as_posix()
        if raw_path != canonical:
            raise PolicyError("write_path_must_be_canonical")
        validate_write_target(root, canonical)
        if canonical in normalized:
            raise PolicyError("duplicate_write_path_denied")
        normalized.append(canonical)
    return normalized


def require_write_path_allowlisted(raw_path: str, allowed_paths: Iterable[str]) -> str:
    """Require an exact canonical path match to the caller-approved task allowlist."""
    relative = validate_relative_path(raw_path)
    canonical = relative.as_posix()
    if raw_path != canonical:
        raise PolicyError("write_path_must_be_canonical")
    allowed = set(allowed_paths)
    if canonical not in allowed:
        raise PolicyError("write_path_not_in_task_allowlist")
    return canonical


def validate_feature_branch(branch: str) -> str:
    if not branch or branch in {"main", "master", "develop", "production", "release"}:
        raise PolicyError("protected_or_detached_branch_write_denied")
    if branch.startswith("release/") or not branch.startswith(ALLOWED_BRANCH_PREFIXES):
        raise PolicyError("branch_name_must_use_governed_feature_prefix")
    return branch


def require_write_approval() -> None:
    if os.environ.get("AFAGHX_WRITE_ENABLED") != "1":
        raise PolicyError("write_disabled: set AFAGHX_WRITE_ENABLED=1 after reviewing the task")


def current_branch(root: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=root, text=True, capture_output=True, check=True, timeout=10,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise PolicyError("git_branch_unavailable") from exc
    return validate_feature_branch(result.stdout.strip())


def assert_no_secret_material(content: str) -> None:
    for pattern in _SECRET_VALUE_PATTERNS:
        if pattern.search(content):
            raise PolicyError("possible_secret_material_detected_write_denied")


def sha256_text(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def verify_evidence_manifest(
    evidence_path: str | Path,
    manifest_path: str | Path,
    expected_filename: str = "crewai-validation-evidence.json",
) -> str:
    """Fail closed unless one strict manifest entry names and hashes the exact evidence file."""
    evidence = Path(evidence_path)
    manifest = Path(manifest_path)
    _reject_symlink_path_components(evidence)
    _reject_symlink_path_components(manifest)
    if evidence.is_symlink() or manifest.is_symlink():
        raise PolicyError("evidence_manifest_symlink_denied")
    if not evidence.is_file() or not manifest.is_file():
        raise PolicyError("evidence_or_manifest_missing")
    if evidence.name != expected_filename:
        raise PolicyError("evidence_filename_mismatch")
    if evidence.parent.resolve() != manifest.parent.resolve():
        raise PolicyError("evidence_manifest_directory_mismatch")
    try:
        lines = manifest.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError) as exc:
        raise PolicyError("manifest_unreadable") from exc
    if len(lines) != 1:
        raise PolicyError("manifest_must_contain_exactly_one_entry")
    match = re.fullmatch(r"([0-9a-f]{64})  (.+)", lines[0])
    if match is None:
        raise PolicyError("manifest_entry_malformed")
    expected_digest, declared_filename = match.groups()
    if declared_filename != expected_filename or declared_filename != evidence.name:
        raise PolicyError("manifest_filename_mismatch")
    try:
        actual_digest = hashlib.sha256(evidence.read_bytes()).hexdigest()
    except OSError as exc:
        raise PolicyError("evidence_unreadable") from exc
    if actual_digest != expected_digest:
        raise PolicyError("evidence_hash_mismatch")
    return actual_digest


def validate_test_id(test_id: str, allowed: Iterable[str]) -> str:
    if test_id not in set(allowed):
        raise PolicyError("test_id_not_allowlisted")
    return test_id
