"""Runtime wiring for governed AFAGHX missions."""

from __future__ import annotations

from intelligence.ai_gateway.gateway import AIGateway, ProviderPolicy
from intelligence.ai_gateway.openai_provider import OpenAIProvider
from intelligence.mission.engine import Mission, MissionEngine, MissionResult


def build_openai_mission_engine() -> MissionEngine:
    provider = OpenAIProvider()
    gateway = AIGateway(
        providers={"openai-codex": provider},
        policies={
            "openai-codex": ProviderPolicy(
                allowed_modes=frozenset({"plan", "audit", "execute"}),
                network_access=True,
                api_credits_required=True,
            )
        },
    )
    return MissionEngine(gateway, provider_name="openai-codex")


def run_mission(mission: Mission) -> MissionResult:
    return build_openai_mission_engine().run(mission, mode="execute")
