"""Fail-closed, zero-cost structural validation of the CrewAI project."""
from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CREW_PATH = ROOT / "crew.jsonc"
EXPECTED_MODEL = "openai/gpt-5.6-sol"
REQUIRED_TASK_FIELDS = {"name", "description", "expected_output", "agent"}


def validate() -> dict:
    crew = json.loads(CREW_PATH.read_text(encoding="utf-8"))
    if crew.get("name") != "AFAGHX Governed Engineering Crew":
        raise ValueError("unexpected_crew_name")
    if crew.get("process") != "sequential":
        raise ValueError("crew_process_must_be_sequential")
    if crew.get("memory") is not False:
        raise ValueError("crew_memory_must_remain_disabled")
    if crew.get("planning") is not False:
        raise ValueError("uncontrolled_planning_must_remain_disabled")

    names = crew.get("agents")
    tasks = crew.get("tasks")
    if not isinstance(names, list) or len(names) != 4 or len(set(names)) != len(names):
        raise ValueError("crew_must_define_four_unique_agents")
    if not isinstance(tasks, list) or len(tasks) != 4:
        raise ValueError("crew_must_define_four_ordered_tasks")

    tool_refs = set()
    for name in names:
        path = ROOT / "agents" / f"{name}.jsonc"
        if not path.is_file():
            raise ValueError(f"agent_file_missing:{path.name}")
        agent = json.loads(path.read_text(encoding="utf-8"))
        for key in ("role", "goal", "backstory", "llm", "tools", "settings"):
            if key not in agent:
                raise ValueError(f"agent_field_missing:{name}:{key}")
        if agent["llm"] != EXPECTED_MODEL:
            raise ValueError(f"unapproved_model:{name}:{agent['llm']}")
        if agent["settings"].get("allow_delegation") is not False:
            raise ValueError(f"agent_delegation_must_be_disabled:{name}")
        for ref in agent["tools"]:
            if not isinstance(ref, str) or not ref.startswith("custom:"):
                raise ValueError(f"only_governed_custom_tools_allowed:{name}:{ref}")
            tool_name = ref.removeprefix("custom:")
            if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", tool_name):
                raise ValueError(f"invalid_custom_tool_name:{ref}")
            tool_path = ROOT / "tools" / f"{tool_name}.py"
            if not tool_path.is_file():
                raise ValueError(f"custom_tool_missing:{tool_name}")
            tool_refs.add(tool_name)

    task_names = [task.get("name") for task in tasks]
    if len(set(task_names)) != len(task_names):
        raise ValueError("task_names_must_be_unique")
    seen = set()
    for task in tasks:
        missing = REQUIRED_TASK_FIELDS - set(task)
        if missing:
            raise ValueError(f"task_missing_fields:{task.get('name')}:{sorted(missing)}")
        if not str(task["expected_output"]).strip():
            raise ValueError(f"expected_output_required:{task['name']}")
        if task["agent"] not in names:
            raise ValueError(f"task_agent_unknown:{task['name']}")
        for dependency in task.get("context", []):
            if dependency not in seen:
                raise ValueError(f"task_context_must_reference_previous_task:{task['name']}:{dependency}")
        seen.add(task["name"])

    if not crew.get("inputs", {}).get("request", "").strip():
        raise ValueError("default_request_input_required")
    for path in (ROOT / "README.md", ROOT / "pyproject.toml", ROOT / "main.py"):
        if not path.is_file():
            raise ValueError(f"required_project_file_missing:{path.name}")

    from crewai.project.json_loader import validate_crew_project
    validate_crew_project(CREW_PATH)

    result = {
        "status": "PASS",
        "truth_state": "TESTED",
        "crew": crew["name"],
        "agents": len(names),
        "tasks": len(tasks),
        "custom_tools": sorted(tool_refs),
        "model": EXPECTED_MODEL,
        "paid_llm_execution": "NOT_RUN",
        "production_readiness": "NOT_PROVEN",
        "unknown_is_not_green": True,
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result


if __name__ == "__main__":
    validate()
