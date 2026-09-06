"""Governed Mission -> Plan -> Implement -> Test -> Evidence orchestration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from intelligence.ai_gateway.gateway import AIGateway
from intelligence.ai_gateway.provider import ProviderRequest, ProviderResponse


@dataclass(frozen=True)
class Mission:
    mission_id: str
    objective: str
    run_id: str


@dataclass(frozen=True)
class MissionResult:
    mission_id: str
    status: str
    plan: ProviderResponse
    implementation: ProviderResponse
    test: ProviderResponse
    evidence: ProviderResponse


class MissionEngine:
    """Orchestrates a mission without granting agents merge authority."""

    def __init__(self, gateway: AIGateway, provider_name: str = "openai-codex") -> None:
        self._gateway = gateway
        self._provider_name = provider_name

    def run(self, mission: Mission, *, mode: str = "execute") -> MissionResult:
        plan = self._invoke(mission, "plan", mission.objective, mode="plan")
        implementation = self._invoke(
            mission,
            "implement",
            f"Mission objective:\n{mission.objective}\n\nApproved plan:\n{plan.output}",
            mode=mode,
        )
        test = self._invoke(
            mission,
            "review",
            f"Review implementation for mission {mission.mission_id}:\n{implementation.output}",
            mode="audit",
        )
        evidence = self._invoke(
            mission,
            "summarize_evidence",
            f"Summarize mission evidence.\nPlan:\n{plan.output}\nImplementation:\n{implementation.output}\nTest/review:\n{test.output}",
            mode="audit",
        )
        return MissionResult(
            mission_id=mission.mission_id,
            status="success",
            plan=plan,
            implementation=implementation,
            test=test,
            evidence=evidence,
        )

    def _invoke(self, mission: Mission, operation: str, prompt: str, *, mode: str) -> ProviderResponse:
        return self._gateway.run(
            provider_name=self._provider_name,
            mode=mode,
            request=ProviderRequest(
                operation=operation,
                prompt=prompt,
                run_id=f"{mission.run_id}:{operation}",
                model="gpt-5.6-luna",
            ),
        )
