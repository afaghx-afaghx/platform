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


def repository_root(start: str | Path | None = None) -> Path:
    explicit = os.environ.get("AFAGHX_REPO_ROOT")
    candidate = Path(explicit).expanduser() if explicit else Path(start or Path.cwd())
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=candidate, text=True, capture_output=True, check=True, timeout=10,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise PolicyError("repository_root_unavailable: run inside a Git checkout") from exc
    return Path(result.stdout.strip()).resolve()


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
    if any(part in EXCLUDED_DIRS for part in path.parts):
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


def resolve_read_target(root: Path, raw_path: str) -> Path:
    rel = validate_relative_path(raw_path)
    if is_sensitive_path(rel):
        raise PolicyError("sensitive_path_read_denied")
    target = (root / Path(*rel.parts)).resolve()
    if target != root and root not in target.parents:
        raise PolicyError("path_escape_denied")
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
    if top not in ALLOWED_WRITE_ROOTS:
        raise PolicyError("write_root_not_allowlisted")
    if top in PROTECTED_ROOTS or is_sensitive_path(rel):
        raise PolicyError("protected_path_write_denied")
    if any(part.startswith(".") for part in rel.parts):
        raise PolicyError("hidden_path_write_denied")
    if rel.name.lower() == "agents.md" or rel.name.lower() in {x.lower() for x in PROTECTED_FILES}:
        raise PolicyError("protected_file_write_denied")
    target = (root / Path(*rel.parts)).resolve()
    if target != root and root not in target.parents:
        raise PolicyError("path_escape_denied")
    if target.exists() and not target.is_file():
        raise PolicyError("target_is_not_file")
    return target


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


def validate_test_id(test_id: str, allowed: Iterable[str]) -> str:
    if test_id not in set(allowed):
        raise PolicyError("test_id_not_allowlisted")
    return test_id
