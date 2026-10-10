"""Explicit, policy-governed runtime entry point for the AFAGHX CrewAI assistant."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from crewai import Agent, Crew, Process, Task

PROJECT_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = PROJECT_ROOT.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from governance import PolicyError, current_branch, repository_root, require_write_approval
from tools.repository_read import RepositoryReadTool
from tools.repository_search import RepositorySearchTool
from tools.run_governed_test import RunGovernedTestTool
from tools.source_write import SourceWriteTool

CONFIG_PATH = PROJECT_ROOT / "crew.jsonc"
EXPECTED_MODEL = "openai/gpt-5.6-sol"


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

    tasks = []
    for task_config in config["tasks"]:
        task_kwargs = {
            "description": task_config["description"],
            "expected_output": task_config["expected_output"],
            "agent": agents[task_config["agent"]],
            "context": [task for task in tasks if task_config.get("context") and task.description in {
                next(
                    item["description"]
                    for item in config["tasks"]
                    if item["name"] == context_name
                )
                for context_name in task_config.get("context", [])
            }],
        }
        if task_config.get("output_file"):
            output_path = PROJECT_ROOT / task_config["output_file"]
            output_path.parent.mkdir(parents=True, exist_ok=True)
            task_kwargs["output_file"] = str(output_path)
        if task_config.get("markdown") is not None:
            task_kwargs["markdown"] = bool(task_config["markdown"])
        tasks.append(Task(**task_kwargs))

    crew = Crew(
        agents=list(agents.values()),
        tasks=tasks,
        process=Process.sequential,
        verbose=bool(config.get("verbose", True)),
        memory=False,
        planning=False,
    )
    return crew, agents, tasks


def preflight_for_execution() -> str:
    if not os.environ.get("OPENAI_API_KEY"):
        raise PolicyError("OPENAI_API_KEY_missing; no model call was attempted")
    if os.environ.get("AFAGHX_WRITE_ENABLED") != "1":
        raise PolicyError("source_write_opt_in_missing; set AFAGHX_WRITE_ENABLED=1 only after reviewing this task")
    root = repository_root(REPOSITORY_ROOT)
    return current_branch(root)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Governed AFAGHX CrewAI engineering assistant")
    parser.add_argument("--request", help="One narrow coding task. Do not include secrets.")
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Instantiate the configured crew and validate wiring without calling the model or modifying source files.",
    )
    args = parser.parse_args(argv)

    try:
        crew, agents, tasks = build_crew()
        if args.validate_only:
            result = {
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
            print(json.dumps(result, indent=2, ensure_ascii=False))
            return 0

        request = (args.request or "").strip()
        if not request:
            parser.error("a single narrow --request is required for a real run")
        branch = preflight_for_execution()
        print(f"PRECHECK_PASS branch={branch} model={EXPECTED_MODEL} task_sha256_input_length={len(request)}")
        # Make the CrewAI output path stable regardless of the caller's cwd.
        os.chdir(PROJECT_ROOT)
        result = crew.kickoff(inputs={"request": request})
        print("CREW_EXECUTION_FINISHED")
        print(str(result))
        print("truth_state=MODEL_RUN_COMPLETED; human review and independent tests remain required")
        return 0
    except (OSError, ValueError, PolicyError) as exc:
        print(f"CREW_EXECUTION_BLOCKED: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
