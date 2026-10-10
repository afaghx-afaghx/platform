import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Type

from pydantic import BaseModel, Field
from crewai.tools import BaseTool

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from governance import PolicyError, repository_root, validate_test_id


TEST_COMMANDS = {
    "crew_contract": [sys.executable, "local_validation/validate_project.py"],
    "crew_tests": [sys.executable, "-m", "unittest", "discover", "-s", "local_validation/tests", "-v"],
    "gateway_runtime": ["node", "--test", "platform/Gateway/runtime.integration.test.mjs"],
    "core_security": ["npm", "--prefix", "core/AFX-CORE", "run", "test:security"],
    "agent_contract": ["node", "--test", ".ai/runtime/golden-execution.contract.test.mjs"],
}
MAX_SECONDS = 300

# Pass only non-sensitive process settings into test subprocesses. The CrewAI
# parent needs OPENAI_API_KEY to call the provider; repository tests do not.
# An edited test must not inherit API, GitHub, cloud, database, or deploy secrets.
TEST_ENV_ALLOWLIST = {
    "PATH", "HOME", "USERPROFILE", "SYSTEMROOT", "WINDIR",
    "TEMP", "TMP", "TMPDIR", "APPDATA", "LOCALAPPDATA",
    "PATHEXT", "COMSPEC", "LANG", "LC_ALL", "CI",
}


def sanitized_test_environment(source_env=None):
    source = os.environ if source_env is None else source_env
    safe = {key: source[key] for key in TEST_ENV_ALLOWLIST if key in source}
    safe["PYTHONDONTWRITEBYTECODE"] = "1"
    return safe



class GovernedTestInput(BaseModel):
    test_id: str = Field(
        ...,
        description="Required allowlisted test ID: crew_contract, crew_tests, gateway_runtime, core_security, or agent_contract. Arbitrary commands are not accepted.",
    )


class RunGovernedTestTool(BaseTool):
    name: str = "run_governed_test"
    description: str = "Run exactly one fixed allowlisted repository test. It accepts a test ID, not shell text; returns the exact command, exit code, and bounded output. It never commits, pushes, merges, or deploys."
    args_schema: Type[BaseModel] = GovernedTestInput

    def _run(self, test_id: str) -> str:
        try:
            test_id = validate_test_id(test_id, TEST_COMMANDS.keys())
            root = repository_root(Path.cwd())
            command = TEST_COMMANDS[test_id]
            if command[0] in {"node", "npm"} and not shutil.which(command[0]):
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
                stdout = result.stdout[-8000:]
                stderr = result.stderr[-4000:]
                token_patterns = [
                    (r"\bsk-[A-Za-z0-9]{16,}\b", "[REDACTED_SECRET]"),
                    (r"\bgh[pousr]_[A-Za-z0-9]{20,}\b", "[REDACTED_SECRET]"),
                    (r"\bgithub_pat_[A-Za-z0-9_]{20,}\b", "[REDACTED_SECRET]"),
                ]
                for pattern, replacement in token_patterns:
                    stdout = re.sub(pattern, replacement, stdout)
                    stderr = re.sub(pattern, replacement, stderr)
                status = "PASS" if result.returncode == 0 else "FAIL"
                return (
                    f"TEST_{status}\ntest_id={test_id}\ncommand={command!r}"
                    f"\nexit_code={result.returncode}\n--- stdout ---\n{stdout}"
                    f"\n--- stderr ---\n{stderr}"
                )
            except subprocess.TimeoutExpired:
                return f"TEST_FAIL\ntest_id={test_id}\nreason=timeout_after_{MAX_SECONDS}_seconds"
        except (OSError, PolicyError) as exc:
            return f"TEST_NOT_RUN\ntest_id={test_id}\nreason={exc}"
