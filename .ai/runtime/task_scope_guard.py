#!/usr/bin/env python3
"""Fail-closed scope gate for autonomous AFAGHX task execution."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[2]
GENERATED_ROOT_FILES = {
    "agent-execution-notes.md",
    "agent-execution-prompt.md",
    "agent-execution-report.md",
}
PROTECTED_PREFIXES = (
    ".ai/policies/",
    ".github/workflows/",
    ".github/agents/",
    ".github/skills/",
)
PROTECTED_EXACT = {
    "AGENTS.md",
    ".ai/tasks/queue.json",
    ".ai/command-center.yaml",
    ".ai/providers.yaml",
    ".ai/runtime/agent-loop.py",
    ".ai/runtime/forensics.py",
    ".ai/runtime/task_scope_guard.py",
    ".ai/runtime/task_scope_guard_contract_test.py",
    ".github/workflows/ai-engineering-command-center.yml",
    ".github/workflows/ai-engineering-command-center-local.yml",
    ".github/workflows/ai-architecture-gate.yml",
    "opencode.json",
    ".opencode/agents/afaghx-engineer.md",
    "scripts/ai/local-agent-preflight.sh",
    "scripts/ai/run-local-agent.sh",
}
SECRET_PATH = re.compile(r"(^|/)(\.env($|\.)|.*\.(pem|key)$|id_rsa$)", re.IGNORECASE)


class ScopeViolation(ValueError):
    """The candidate violates its immutable task contract."""


def validate_scope(
    task_id: str,
    mode: str,
    baseline_queue: bytes,
    current_queue: bytes,
    changed_paths: Iterable[str],
) -> list[str]:
    """Validate candidate paths exclusively against the immutable queue."""
    if current_queue != baseline_queue:
        raise ScopeViolation("Canonical task queue must remain unchanged during agent execution")

    try:
        queue = json.loads(baseline_queue.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ScopeViolation("Immutable baseline task queue is not valid UTF-8 JSON") from exc

    tasks = queue.get("tasks", [])
    task = next((item for item in tasks if item.get("id") == task_id), None)
    if task is None:
        raise ScopeViolation(f"Unknown task in immutable baseline: {task_id}")
    if task.get("status") != "READY":
        raise ScopeViolation(f"Task is not READY in immutable baseline: {task_id}")
    if task.get("mode") != mode:
        raise ScopeViolation(f"Requested mode is not governed for task {task_id}")

    paths = list(changed_paths)
    if not paths:
        raise ScopeViolation("Candidate contains no changed files")

    for path in paths:
        if not path or path.startswith("/") or "\\" in path or any(c in path for c in "\r\n\0"):
            raise ScopeViolation("Unsafe or ambiguous path in candidate manifest")
        if any(part in {".", ".."} for part in path.split("/")):
            raise ScopeViolation(f"Path traversal is not allowed: {path}")
        if path in PROTECTED_EXACT or any(path.startswith(prefix) for prefix in PROTECTED_PREFIXES):
            raise ScopeViolation(f"Protected governance or execution-control file modified: {path}")
        if SECRET_PATH.search(path):
            raise ScopeViolation(f"Secret-like path detected: {path}")

    required_raw = task.get("required_change_paths", [])
    if not isinstance(required_raw, list) or not required_raw or any(not isinstance(p, str) for p in required_raw):
        raise ScopeViolation("Immutable task has an invalid required_change_paths contract")
    required = set(required_raw)
    missing = sorted(required - set(paths))
    if missing:
        raise ScopeViolation(f"Required task paths not changed: {missing}")

    allowed = required | GENERATED_ROOT_FILES
    unexpected = sorted(set(paths) - allowed)
    if unexpected:
        raise ScopeViolation(f"Unexpected changed files outside required task paths: {unexpected}")

    for generated in GENERATED_ROOT_FILES & set(paths):
        if "/" in generated:
            raise ScopeViolation(f"Generated execution file must remain at repository root: {generated}")

    return sorted(set(paths))


def _git_bytes(*args: str) -> bytes:
    return subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    ).stdout


def main() -> int:
    if len(sys.argv) != 4:
        print("usage: task_scope_guard.py TASK_ID MODE BASELINE_SHA", file=sys.stderr)
        return 2

    task_id, mode, baseline_sha = sys.argv[1:]
    try:
        baseline_queue = _git_bytes("show", f"{baseline_sha}:.ai/tasks/queue.json")
        current_queue = (ROOT / ".ai/tasks/queue.json").read_bytes()

        untracked_raw = _git_bytes("ls-files", "--others", "--exclude-standard", "-z")
        untracked = [item.decode("utf-8", errors="strict") for item in untracked_raw.split(b"\0") if item]
        for path in untracked:
            if any(c in path for c in "\r\n\0") or "\\" in path or path.startswith("/"):
                raise ScopeViolation("Unsafe or ambiguous untracked path")

        if untracked:
            subprocess.run(["git", "add", "-N", "--", *untracked], cwd=ROOT, check=True)

        changed_raw = _git_bytes("diff", "--name-only", "--no-renames", "-z", baseline_sha)
        changed = [item.decode("utf-8", errors="strict") for item in changed_raw.split(b"\0") if item]
        validated = validate_scope(task_id, mode, baseline_queue, current_queue, changed)

        manifest = ROOT / "changed-files.txt"
        manifest.write_text("".join(path + "\n" for path in validated), encoding="utf-8")
        print("TASK_SCOPE=PASS")
        print(f"TASK_ID={task_id}")
        print(f"MODE={mode}")
        print(f"CHANGED_PATH_COUNT={len(validated)}")
        return 0
    except (OSError, UnicodeDecodeError, subprocess.CalledProcessError, ScopeViolation) as exc:
        print(f"TASK_SCOPE=BLOCKED: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
