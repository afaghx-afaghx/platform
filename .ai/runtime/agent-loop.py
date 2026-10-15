#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
QUEUE = ROOT / ".ai" / "tasks" / "queue.json"
OUT = ROOT / "agent-evidence"
OUT.mkdir(parents=True, exist_ok=True)

# Exact argv allowlist: subprocess is intentionally invoked without a shell.
ALLOWED = {
    ('node','--check','.ai/runtime/local-provider.contract.test.mjs'),
    ('node','scripts/ai/validate-local-provider-contract.mjs'),
    ('node','--test','.ai/runtime/local-provider.contract.test.mjs'),
    ('node','--test','.ai/runtime/golden-execution.contract.test.mjs'),
    ('node','--test','platform/Gateway/runtime.integration.test.mjs'),
    ('npm','--prefix','core/AFX-CORE','run','test:security'),
}


def run(command: list[str]) -> dict:
    process = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return {
        "command": command,
        "exit_code": process.returncode,
        "stdout": process.stdout[-12000:],
        "stderr": process.stderr[-12000:],
    }


def write_result(result: dict) -> None:
    result.setdefault("truth_scope", "task_execution")
    result.setdefault("system_production_gate", "NOT_EVALUATED_BY_THIS_TASK_WORKFLOW")
    result.setdefault("unknown_is_not_green", True)
    (OUT / "task-loop.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (OUT / "task-loop.md").write_text(
        "# AFAGHX Task Verification Evidence\n\n"
        f"- Task: {result.get('task_id', 'UNKNOWN')}\n"
        f"- Status: {result['status']}\n"
        f"- Truth state: {result['truth_state']}\n"
        f"- Verification state: {result['verification_state']}\n"
        "- Scope: allowlisted task commands only; this is not a release or production approval.\n"
        "- UNKNOWN/PARTIAL evidence is never GREEN.\n",
        encoding="utf-8",
    )


def main() -> int:
    queue = json.loads(QUEUE.read_text(encoding="utf-8"))
    task_id = os.environ.get("AFX_TASK_ID", "").strip()
    ready = [
        task
        for task in queue.get("tasks", [])
        if task.get("status") == "READY"
        and (not task_id or task.get("id") == task_id)
    ]

    baseline_process = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    baseline_sha = baseline_process.stdout.strip() if baseline_process.returncode == 0 else None
    timestamp = datetime.now(timezone.utc).isoformat()

    if not ready:
        write_result({
            "schema_version": "AFX-AI-CEA-TASK-EVIDENCE-2",
            "timestamp": timestamp,
            "baseline_sha": baseline_sha,
            "status": "STOP",
            "truth_state": "UNKNOWN",
            "verification_state": "UNKNOWN",
            "reason": "requested_task_not_READY",
            "requested_task_id": task_id or None,
            "unknown_is_not_green": True,
        })
        return 1

    task = ready[0]
    commands = task.get("verification", {}).get("commands", [])
    if (
        not isinstance(commands, list)
        or not commands
        or any(
            not isinstance(command, list)
            or not command
            or any(not isinstance(part, str) or not part for part in command)
            for command in commands
        )
    ):
        write_result({
            "schema_version": "AFX-AI-CEA-TASK-EVIDENCE-2",
            "timestamp": timestamp,
            "baseline_sha": baseline_sha,
            "task_id": task["id"],
            "status": "STOP",
            "truth_state": "UNKNOWN",
            "verification_state": "UNKNOWN",
            "reason": "missing_or_malformed_verification_commands",
            "unknown_is_not_green": True,
        })
        return 1

    runtime_db_command = ("node", "--test", "platform/Gateway/runtime.integration.test.mjs")
    if any(tuple(command) == runtime_db_command for command in commands) and not os.environ.get("DATABASE_URL", "").strip():
        write_result({
            "schema_version": "AFX-AI-CEA-TASK-EVIDENCE-2",
            "timestamp": timestamp,
            "baseline_sha": baseline_sha,
            "task_id": task["id"],
            "status": "STOP",
            "truth_state": "UNKNOWN",
            "verification_state": "UNKNOWN",
            "reason": "required_DATABASE_URL_missing_for_runtime_integration_test",
            "unknown_is_not_green": True,
        })
        return 1

    # Validate the complete command set before executing any command. This prevents
    # a partly executed task when a later command is outside the approved allowlist.
    invalid_commands = [command for command in commands if tuple(command) not in ALLOWED]
    if invalid_commands:
        write_result({
            "schema_version": "AFX-AI-CEA-TASK-EVIDENCE-2",
            "timestamp": timestamp,
            "baseline_sha": baseline_sha,
            "task_id": task["id"],
            "status": "STOP",
            "truth_state": "UNKNOWN",
            "verification_state": "UNKNOWN",
            "reason": "command_not_allowlisted",
            "commands": invalid_commands,
            "unknown_is_not_green": True,
        })
        return 1

    results = []
    for command in commands:
        result = run(command)
        results.append(result)
        if result["exit_code"] != 0:
            break

    success = len(results) == len(commands) and all(
        result["exit_code"] == 0 for result in results
    )
    # Do not mutate the canonical task queue from a task run. Keeping queue.json
    # unchanged makes tasks reusable and prevents the automation from sneaking
    # control-plane changes into a feature PR. Results live in the evidence bundle.

    verification_state = "GREEN" if success else ("RED" if results else "UNKNOWN")
    # This loop only establishes test execution. PR checks, independent review,
    # merge approval, and production readiness are separate gates.
    truth_state = "TESTED" if success else ("IMPLEMENTED" if results else "UNKNOWN")
    result = {
        "schema_version": "AFX-AI-CEA-TASK-EVIDENCE-2",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "baseline_sha": baseline_sha,
        "task_id": task["id"],
        "mission": task["mission"],
        "mode": task.get("mode", "UNKNOWN"),
        "status": "VERIFY_SUCCESS" if success else "VERIFY_FAILED",
        "truth_state": truth_state,
        "verification_state": verification_state,
        "evidence_scope": "allowlisted task verification only",
        "results": results,
        "unknown_is_not_green": True,
    }
    write_result(result)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
