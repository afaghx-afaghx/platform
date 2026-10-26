import hashlib
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Type

from pydantic import BaseModel, Field
from crewai.tools import BaseTool

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from governance import PolicyError, repository_root, validate_test_id

# Only run validation code under local_validation/, which the source-write policy
# protects from model-authored changes. Broader repository tests/package scripts are
# intentionally not agent-callable because a fixed ID is not an OS sandbox.
TEST_COMMANDS = {
    "crew_contract": [sys.executable, "local_validation/validate_project.py"],
    "crew_tests": [sys.executable, "-m", "unittest", "discover", "-s", "local_validation/tests", "-v"],
}
MAX_SECONDS = 300

# Parent CrewAI keeps the provider credential to make its LLM calls. Test processes
# get only a tiny platform environment and never inherit provider or deploy secrets.
TEST_ENV_ALLOWLIST = {
    "PATH", "HOME", "USERPROFILE", "SYSTEMROOT", "WINDIR",
    "TEMP", "TMP", "TMPDIR", "APPDATA", "LOCALAPPDATA",
    "PATHEXT", "COMSPEC", "LANG", "LC_ALL", "CI",
}
_TEST_EXECUTIONS: list[dict] = []


def clear_test_evidence() -> None:
    _TEST_EXECUTIONS.clear()


def get_test_evidence() -> list[dict]:
    return [dict(item) for item in _TEST_EXECUTIONS]


def sanitized_test_environment(source_env=None):
    source = os.environ if source_env is None else source_env
    safe = {key: source[key] for key in TEST_ENV_ALLOWLIST if key in source}
    safe["PYTHONDONTWRITEBYTECODE"] = "1"
    return safe


def _redact(text: str) -> str:
    patterns = [
        (r"\bsk-[A-Za-z0-9_-]{16,}\b", "[REDACTED_SECRET]"),
        (r"\bgh[pousr]_[A-Za-z0-9]{20,}\b", "[REDACTED_SECRET]"),
        (r"\bgithub_pat_[A-Za-z0-9_]{20,}\b", "[REDACTED_SECRET]"),
        (r"(?i)\b(OPENAI_API_KEY|GITHUB_TOKEN|AWS_SECRET_ACCESS_KEY|AFAGHX_DEPLOY_SSH_PRIVATE_KEY)\s*[:=]\s*[^,\s]+", r"\1=[REDACTED_SECRET]"),
        (r"(?i)\bpostgres(?:ql)?://[^\s'\"<>]+", "[REDACTED_DATABASE_URL]"),
        (r"(?i)\b(password|passwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*[^,\s]+", r"\1=[REDACTED_SECRET]"),
    ]
    for pattern, replacement in patterns:
        text = re.sub(pattern, replacement, text)
    return text


def _record_test(
    test_id: str,
    command: list[str],
    status: str,
    started_at: str,
    started_clock: float,
    exit_code,
    stdout: str = "",
    stderr: str = "",
    reason: str | None = None,
) -> None:
    _TEST_EXECUTIONS.append(
        {
            "test_id": test_id,
            "command": list(command),
            "status": status,
            "exit_code": exit_code,
            "started_at": started_at,
            "duration_ms": round((time.monotonic() - started_clock) * 1000),
            "stdout_sha256": hashlib.sha256(stdout.encode("utf-8", errors="replace")).hexdigest(),
            "stderr_sha256": hashlib.sha256(stderr.encode("utf-8", errors="replace")).hexdigest(),
            "reason": reason,
        }
    )


class GovernedTestInput(BaseModel):
    test_id: str = Field(
        ...,
        description="Required protected local validation test ID: crew_contract or crew_tests. Broader project tests and package scripts are not exposed to the agent tool.",
    )


class RunGovernedTestTool(BaseTool):
    name: str = "run_governed_test"
    description: str = "Run exactly one fixed local_validation test ID, not a repository package script or arbitrary shell command. Returns bounded redacted output and machine-readable evidence. This does not constitute an OS sandbox; broader repository tests must run in a separately reviewed CI/sandbox. Never commits, pushes, merges, or deploys."
    args_schema: Type[BaseModel] = GovernedTestInput

    def _run(self, test_id: str) -> str:
        try:
            test_id = validate_test_id(test_id, TEST_COMMANDS.keys())
            root = repository_root(Path.cwd())
            command = TEST_COMMANDS[test_id]
            started_at = datetime.now(timezone.utc).isoformat()
            started_clock = time.monotonic()

            if command[0] in {"node", "npm"} and not shutil.which(command[0]):
                _record_test(
                    test_id, command, "NOT_RUN", started_at, started_clock, None,
                    reason=f"required_executable_missing:{command[0]}",
                )
                return f"TEST_NOT_RUN\ntest_id={test_id}\nreason=required_executable_missing:{command[0]}"

            try:
                result = subprocess.run(
                    command,
                    cwd=root,
                    text=True,
                    capture_output=True,
                    timeout=MAX_SECONDS,
                    check=False,
                    env=sanitized_test_environment(),
                )
            except subprocess.TimeoutExpired as exc:
                stdout = exc.stdout.decode("utf-8", errors="replace") if isinstance(exc.stdout, bytes) else (exc.stdout or "")
                stderr = exc.stderr.decode("utf-8", errors="replace") if isinstance(exc.stderr, bytes) else (exc.stderr or "")
                _record_test(
                    test_id, command, "FAIL", started_at, started_clock, None,
                    stdout=stdout, stderr=stderr, reason=f"timeout_after_{MAX_SECONDS}_seconds",
                )
                return f"TEST_FAIL\ntest_id={test_id}\nreason=timeout_after_{MAX_SECONDS}_seconds"
            except OSError as exc:
                _record_test(
                    test_id, command, "NOT_RUN", started_at, started_clock, None,
                    reason=f"executable_unavailable:{type(exc).__name__}",
                )
                return f"TEST_NOT_RUN\ntest_id={test_id}\nreason=executable_unavailable:{type(exc).__name__}"

            raw_stdout = result.stdout or ""
            raw_stderr = result.stderr or ""
            _record_test(
                test_id,
                command,
                "PASS" if result.returncode == 0 else "FAIL",
                started_at,
                started_clock,
                result.returncode,
                stdout=raw_stdout,
                stderr=raw_stderr,
                reason=None if result.returncode == 0 else "nonzero_exit_code",
            )
            stdout = _redact(raw_stdout[-8000:])
            stderr = _redact(raw_stderr[-4000:])
            status = "PASS" if result.returncode == 0 else "FAIL"
            return (
                f"TEST_{status}\ntest_id={test_id}\ncommand={command!r}"
                f"\nexit_code={result.returncode}\n--- stdout ---\n{stdout}"
                f"\n--- stderr ---\n{stderr}"
            )
        except (OSError, PolicyError) as exc:
            return f"TEST_NOT_RUN\ntest_id={test_id}\nreason={exc}"
