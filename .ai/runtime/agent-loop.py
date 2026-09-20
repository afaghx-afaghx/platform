#!/usr/bin/env python3
"""Governed deterministic task loop for AFX-AI-CEA-001."""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
QUEUE = ROOT / ".ai" / "tasks" / "queue.json"
OUT = ROOT / "agent-evidence"
OUT.mkdir(exist_ok=True)

ALLOWED_COMMANDS = {
    ("node", "--test", "platform/Gateway/runtime.integration.test.mjs"),
    ("npm", "run", "test:security"),
    ("npm", "run", "test:persistence"),
}

def run(command: list[str]) -> dict:
    completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
    return {
        "command": command,
        "exit_code": completed.returncode,
        "stdout": completed.stdout[-12000:],
        "stderr": completed.stderr[-12000:],
    }

def main() -> int:
    queue = json.loads(QUEUE.read_text())
    tasks = queue.get("tasks", [])
    ready = [task for task in tasks if task.get("status") == "READY"]
    if not ready:
        result = {
            "schema_version": "AFX-AI-CEA-TASK-EVIDENCE-1",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "IDLE",
            "truth_state": "PROVEN",
            "message": "No READY task is present in the governed queue.",
        }
        (OUT / "task-loop.json").write_text(json.dumps(result, indent=2) + "\n")
        print(json.dumps(result, indent=2))
        return 0

    task = ready[0]
    results = []
    for command in task.get("verification", {}).get("commands", []):
        normalized = tuple(command)
        if normalized not in ALLOWED_COMMANDS:
            result = {
                "status": "STOP",
                "truth_state": "UNKNOWN",
                "reason": "command_not_allowlisted",
                "task_id": task.get("id"),
                "command": command,
            }
            (OUT / "task-loop.json").write_text(json.dumps(result, indent=2) + "\n")
            print(json.dumps(result, indent=2))
            return 1
        results.append(run(command))

    success = all(item["exit_code"] == 0 for item in results)
    result = {
        "schema_version": "AFX-AI-CEA-TASK-EVIDENCE-1",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "task_id": task["id"],
        "mission": task["mission"],
        "status": "VERIFY_SUCCESS" if success else "VERIFY_FAILED",
        "truth_state": "PROVEN" if success else "TESTED",
        "results": results,
        "unknown_is_not_green": True,
    }
    (OUT / "task-loop.json").write_text(json.dumps(result, indent=2) + "\n")
    (OUT / "task-loop.md").write_text(
        "# AFAGHX Autonomous Task Loop Evidence\n\n"
        f"- Task: {task['id']}\n"
        f"- Status: {result['status']}\n"
        f"- Truth state: {result['truth_state']}\n"
        f"- Verified at: {result['timestamp']}\n"
        "- UNKNOWN/PARTIAL evidence is never GREEN.\n"
    )
    print(json.dumps(result, indent=2))
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
