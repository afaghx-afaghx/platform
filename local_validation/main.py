"""Explicit, policy-governed runtime entry point for the AFAGHX CrewAI assistant."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from crewai import Agent, Crew, Process, Task

PROJECT_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = PROJECT_ROOT.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from governance import (  # noqa: E402
    PolicyError,
    assert_no_secret_material,
    current_branch,
    repository_root,
    validate_allowed_write_paths,
)
from tools.repository_read import RepositoryReadTool  # noqa: E402
from tools.repository_search import RepositorySearchTool  # noqa: E402
from tools.run_governed_test import (  # noqa: E402
    RunGovernedTestTool,
    clear_test_evidence,
    get_test_evidence,
)
from tools.source_write import SourceWriteTool  # noqa: E402

CONFIG_PATH = PROJECT_ROOT / "crew.jsonc"
EXPECTED_MODEL = "openai/gpt-5.6-sol"
OUTPUT_DIR = PROJECT_ROOT / "output"
FINAL_GATE_PATH = OUTPUT_DIR / "final-gate.md"
RUN_EVIDENCE_PATH = OUTPUT_DIR / "crewai-run-evidence.json"

CANDIDATE_DECISION_PATTERN = re.compile(
    r"(?m)^AFX_CANDIDATE_DECISION: (PASS|BLOCKED)[ \t]*\r?$"
)


def parse_evidence_audit_decision(report: str) -> str:
    """Accept one exact machine-gate marker; absent, malformed, or duplicated markers block."""
    matches = CANDIDATE_DECISION_PATTERN.findall(report)
    return matches[0] if len(matches) == 1 else "MISSING_OR_AMBIGUOUS"


def candidate_run_passed(
    *,
    model_execution: str,
    changed_paths_valid: bool,
    diff_check_status: str,
    whitespace_findings: list[str],
    tests_pass: bool,
    final_gate_exists: bool,
    evidence_audit_decision: str,
) -> bool:
    """A successful model call or present report alone can never pass the candidate gate."""
    return (
        model_execution == "SUCCESS"
        and changed_paths_valid
        and diff_check_status == "PASS"
        and not whitespace_findings
        and tests_pass
        and final_gate_exists
        and evidence_audit_decision == "PASS"
    )



def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def build_crew():
    """Build CrewAI objects without calling the configured LLM."""
    config = load_config()
    tool_registry = {
        "repository_read": RepositoryReadTool(),
        "repository_search": RepositorySearchTool(),
        "run_governed_test": RunGovernedTestTool(),
        "source_write": SourceWriteTool(),
    }

    agents = {}
    for name in config["agents"]:
        agent_config = json.loads(
            (PROJECT_ROOT / "agents" / f"{name}.jsonc").read_text(encoding="utf-8")
        )
        if agent_config.get("llm") != EXPECTED_MODEL:
            raise ValueError(f"unapproved_model:{name}")
        custom_tools = []
        for reference in agent_config.get("tools", []):
            if not isinstance(reference, str) or not reference.startswith("custom:"):
                raise ValueError(f"unapproved_tool_reference:{name}:{reference}")
            tool_name = reference.removeprefix("custom:")
            if tool_name not in tool_registry:
                raise ValueError(f"unknown_custom_tool:{tool_name}")
            custom_tools.append(tool_registry[tool_name])
        settings = agent_config["settings"]
        agents[name] = Agent(
            role=agent_config["role"],
            goal=agent_config["goal"],
            backstory=agent_config["backstory"],
            llm=agent_config["llm"],
            tools=custom_tools,
            verbose=bool(settings.get("verbose", True)),
            allow_delegation=False,
            max_iter=int(settings.get("max_iter", 8)),
            max_retry_limit=int(settings.get("max_retry_limit", 2)),
        )

    tasks_by_name = {}
    for task_config in config["tasks"]:
        dependencies = task_config.get("context", [])
        unknown = [name for name in dependencies if name not in tasks_by_name]
        if unknown:
            raise ValueError(
                f"task_context_must_reference_previous_task:{task_config['name']}:{unknown}"
            )
        task_kwargs = {
            "description": task_config["description"],
            "expected_output": task_config["expected_output"],
            "agent": agents[task_config["agent"]],
            "context": [tasks_by_name[name] for name in dependencies],
        }
        if task_config.get("output_file"):
            # Final-gate output is written by this runtime through the atomic,
            # symlink-safe writer after kickoff; CrewAI must not open this path itself.
            if task_config["output_file"] != "output/final-gate.md":
                raise PolicyError("unapproved_task_output_path")
            ensure_output_dir()
        if task_config.get("markdown") is not None:
            task_kwargs["markdown"] = bool(task_config["markdown"])
        tasks_by_name[task_config["name"]] = Task(**task_kwargs)

    crew = Crew(
        agents=list(agents.values()),
        tasks=list(tasks_by_name.values()),
        process=Process.sequential,
        verbose=bool(config.get("verbose", True)),
        memory=False,
        planning=False,
    )
    return crew, agents, list(tasks_by_name.values())


def _git_text(root: Path, *args: str) -> str:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=root,
            text=True,
            capture_output=True,
            check=True,
            timeout=30,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise PolicyError(f"git_command_unavailable:{args[0]}") from exc
    return result.stdout.strip()


def preflight_for_execution(request: str, requested_paths: list[str]) -> tuple[str, Path, list[str]]:
    if not os.environ.get("OPENAI_API_KEY"):
        raise PolicyError("OPENAI_API_KEY_missing; no model call was attempted")
    if os.environ.get("AFAGHX_WRITE_ENABLED") != "1":
        raise PolicyError(
            "source_write_opt_in_missing; set AFAGHX_WRITE_ENABLED=1 only after reviewing this task"
        )
    if not requested_paths:
        raise PolicyError("explicit_allow_paths_required; pass one or more --allow-path values")
    assert_no_secret_material(request)

    root = repository_root(REPOSITORY_ROOT)
    branch = current_branch(root)
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=root,
            text=True,
            capture_output=True,
            check=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise PolicyError("git_worktree_status_unavailable") from exc
    if result.stdout.strip():
        raise PolicyError("working_tree_must_be_clean_before_agent_run")

    allowed_paths = validate_allowed_write_paths(root, requested_paths)
    os.environ["AFAGHX_ALLOWED_WRITE_PATHS"] = json.dumps(allowed_paths, ensure_ascii=False)
    return branch, root, allowed_paths


def _changed_paths(root: Path) -> list[str]:
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
            cwd=root,
            capture_output=True,
            check=True,
            timeout=15,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise PolicyError("changed_path_evidence_unavailable") from exc

    entries = result.stdout.split(b"\0")
    found: list[str] = []
    index = 0
    while index < len(entries):
        entry = entries[index]
        index += 1
        if len(entry) < 4:
            continue
        status = entry[:2].decode("ascii", errors="replace")
        path = entry[3:].decode("utf-8", errors="replace")
        if path:
            found.append(path.replace("\\", "/"))
        if "R" in status or "C" in status:
            if index < len(entries) and entries[index]:
                found.append(entries[index].decode("utf-8", errors="replace").replace("\\", "/"))
                index += 1
    return sorted(set(found))


def _trailing_whitespace_findings(root: Path, paths: list[str]) -> list[str]:
    findings: list[str] = []
    for raw_path in paths:
        candidate = (root / raw_path).resolve()
        if root not in candidate.parents or not candidate.is_file():
            continue
        try:
            lines = candidate.read_bytes().splitlines()
        except OSError:
            findings.append(f"{raw_path}:unreadable")
            continue
        for line_number, line in enumerate(lines, start=1):
            if line.endswith((b" ", b"\t")):
                findings.append(f"{raw_path}:{line_number}")
                if len(findings) >= 100:
                    return findings
    return findings


def ensure_output_dir() -> Path:
    """Create/use only the canonical local output directory; fail closed on symlinks."""
    project_root = PROJECT_ROOT.resolve()
    output_dir = OUTPUT_DIR
    if output_dir.is_symlink():
        raise PolicyError("output_directory_symlink_denied")
    try:
        output_dir.mkdir(parents=False, exist_ok=True)
    except OSError as exc:
        raise PolicyError("output_directory_unavailable") from exc
    if output_dir.is_symlink() or not output_dir.is_dir():
        raise PolicyError("output_directory_unsafe")
    resolved_output = output_dir.resolve()
    if resolved_output.parent != project_root or resolved_output.name != "output":
        raise PolicyError("output_directory_not_canonical")
    return resolved_output


def _atomic_write_output(name: str, payload: bytes) -> Path:
    """Atomically replace one named output without following a destination symlink."""
    if name not in {"final-gate.md", "crewai-run-evidence.json", "SHA256SUMS"}:
        raise PolicyError("unapproved_output_filename")
    output_dir = ensure_output_dir()
    destination = output_dir / name
    temporary_name = None
    try:
        file_descriptor, temporary_name = tempfile.mkstemp(
            prefix=f".{name}.", suffix=".tmp", dir=output_dir
        )
        with os.fdopen(file_descriptor, "wb") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        # os.replace replaces the directory entry itself and does not follow a
        # symlink at the destination path.
        os.replace(temporary_name, destination)
        temporary_name = None
        return destination
    except OSError as exc:
        raise PolicyError(f"output_write_failed:{name}") from exc
    finally:
        if temporary_name:
            try:
                Path(temporary_name).unlink(missing_ok=True)
            except OSError:
                pass


def _save_run_evidence(report: dict) -> str:
    output_dir = ensure_output_dir()
    payload = (json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n").encode("utf-8")
    evidence_path = output_dir / "crewai-run-evidence.json"
    _atomic_write_output(evidence_path.name, payload)
    digest = hashlib.sha256(payload).hexdigest()
    _atomic_write_output("SHA256SUMS", f"{digest}  {evidence_path.name}\n".encode("utf-8"))
    return digest


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Governed AFAGHX CrewAI engineering assistant")
    parser.add_argument("--request", help="One narrow coding task. Do not include secrets.")
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Instantiate the CrewAI objects without calling the model or modifying source files.",
    )
    parser.add_argument(
        "--allow-path",
        action="append",
        default=[],
        help="Exact repository-relative source/test file path the agent may create or replace. Repeat for each permitted path.",
    )
    args = parser.parse_args(argv)

    try:
        crew, agents, tasks = build_crew()
        if args.validate_only:
            report = {
                "status": "PASS",
                "truth_state": "TESTED",
                "crew": load_config()["name"],
                "agents": len(agents),
                "tasks": len(tasks),
                "process": "sequential",
                "model": EXPECTED_MODEL,
                "llm_call": "NOT_RUN",
                "source_write": "NOT_ARMED_BY_VALIDATE_ONLY",
                "production_readiness": "NOT_PROVEN",
            }
            print(json.dumps(report, indent=2, ensure_ascii=False))
            return 0

        request = (args.request or "").strip()
        if not request:
            parser.error("a single narrow --request is required for a real run")
        branch, root, allowed_paths = preflight_for_execution(request, args.allow_path)
        baseline_sha = _git_text(root, "rev-parse", "HEAD")
        started_at = datetime.now(timezone.utc).isoformat()
        clear_test_evidence()
        FINAL_GATE_PATH.unlink(missing_ok=True)

        model_execution = "FAILED"
        model_error_type = None
        result_digest = None
        rendered_final_gate = ""
        evidence_audit_decision = "MISSING_OR_AMBIGUOUS"
        try:
            result = crew.kickoff(
                inputs={
                    "request": request,
                    "allowed_paths": json.dumps(allowed_paths, ensure_ascii=False),
                    "baseline_sha": baseline_sha,
                    "feature_branch": branch,
                }
            )
            rendered_final_gate = str(result)
            evidence_audit_decision = parse_evidence_audit_decision(rendered_final_gate)
            _atomic_write_output("final-gate.md", rendered_final_gate.encode("utf-8"))
            result_digest = hashlib.sha256(rendered_final_gate.encode("utf-8")).hexdigest()
            model_execution = "SUCCESS"
        except Exception as exc:
            # Do not write raw provider exception payloads to evidence; they can contain
            # request fragments or other sensitive material. The class identifies the failure family.
            model_error_type = type(exc).__name__

        finished_at = datetime.now(timezone.utc).isoformat()
        test_runs = get_test_evidence()
        changed_paths = _changed_paths(root)
        outside_allowlist = sorted(set(changed_paths) - set(allowed_paths))
        try:
            diff_check = subprocess.run(
                ["git", "diff", "--check"],
                cwd=root,
                text=True,
                capture_output=True,
                check=False,
                timeout=30,
            )
            diff_check_status = "PASS" if diff_check.returncode == 0 else "FAIL"
            diff_check_exit_code = diff_check.returncode
        except (OSError, subprocess.SubprocessError):
            diff_check_status = "NOT_RUN"
            diff_check_exit_code = None
        whitespace_findings = _trailing_whitespace_findings(root, changed_paths)
        tests_pass = bool(test_runs) and all(test.get("status") == "PASS" for test in test_runs)
        final_gate_exists = FINAL_GATE_PATH.is_file() and FINAL_GATE_PATH.stat().st_size > 0
        changed_paths_valid = bool(changed_paths) and not outside_allowlist
        passed = candidate_run_passed(
            model_execution=model_execution,
            changed_paths_valid=changed_paths_valid,
            diff_check_status=diff_check_status,
            whitespace_findings=whitespace_findings,
            tests_pass=tests_pass,
            final_gate_exists=final_gate_exists,
            evidence_audit_decision=evidence_audit_decision,
        )
        if passed:
            status, truth_state = "PASS", "TESTED"
        elif changed_paths:
            status, truth_state = "BLOCKED", "IMPLEMENTED"
        else:
            status, truth_state = "BLOCKED", "UNKNOWN"

        final_gate_digest = None
        if final_gate_exists:
            final_gate_digest = hashlib.sha256(FINAL_GATE_PATH.read_bytes()).hexdigest()
        evidence = {
            "schema_version": "AFX-CREWAI-RUN-EVIDENCE-1",
            "status": status,
            "truth_state": truth_state,
            "unknown_is_not_green": True,
            "source": {
                "repository": "afaghx-afaghx/platform",
                "baseline_sha": baseline_sha,
                "branch": branch,
                "changed_paths": changed_paths,
                "allowed_write_paths": allowed_paths,
                "out_of_allowlist_paths": outside_allowlist,
            },
            "request": {
                "sha256": hashlib.sha256(request.encode("utf-8")).hexdigest(),
                "character_count": len(request),
            },
            "model": {
                "id": EXPECTED_MODEL,
                "execution": model_execution,
                "error_type": model_error_type,
                "result_sha256": result_digest,
            },
            "execution": {
                "started_at": started_at,
                "finished_at": finished_at,
                "diff_check": diff_check_status,
                "diff_check_exit_code": diff_check_exit_code,
                "trailing_whitespace_findings": whitespace_findings,
                "tests": test_runs,
                "test_gate": "PASS" if tests_pass else "FAIL_OR_NOT_RUN",
                "final_gate_file": "output/final-gate.md" if final_gate_exists else None,
                "final_gate_sha256": final_gate_digest,
                "evidence_audit_decision": evidence_audit_decision,
            },
            "claims": {
                "truth_state_ceiling": "TESTED",
                "proven": "NOT_CLAIMED",
                "production_readiness": "NOT_PROVEN",
                "human_review": "REQUIRED",
            },
        }
        evidence_digest = _save_run_evidence(evidence)
        print(
            json.dumps(
                {
                    "status": status,
                    "truth_state": truth_state,
                    "model_execution": model_execution,
                    "model_error_type": model_error_type,
                    "evidence_audit_decision": evidence_audit_decision,
                    "branch": branch,
                    "baseline_sha": baseline_sha,
                    "changed_paths": changed_paths,
                    "allowed_write_paths": allowed_paths,
                    "tests": [
                        {"test_id": item["test_id"], "status": item["status"], "exit_code": item["exit_code"]}
                        for item in test_runs
                    ],
                    "evidence_file": "local_validation/output/crewai-run-evidence.json",
                    "evidence_sha256": evidence_digest,
                    "proven": "NOT_CLAIMED",
                    "production_readiness": "NOT_PROVEN",
                    "human_review": "REQUIRED",
                },
                indent=2,
                ensure_ascii=False,
            )
        )
        return 0 if passed else 1
    except (OSError, ValueError, PolicyError) as exc:
        print(f"CREW_EXECUTION_BLOCKED: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
