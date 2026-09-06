"""Zero-cost runtime for end-to-end AFAGHX mission rehearsal."""

from intelligence.ai_gateway.gateway import AIGateway, ProviderPolicy
from intelligence.ai_gateway.offline_review_provider import OfflineReviewProvider
from intelligence.ai_gateway.provider import MockProvider
from intelligence.mission.engine import Mission, MissionEngine, MissionResult


def build_offline_mission_engine() -> MissionEngine:
    gateway = AIGateway(
        providers={
            "mock": MockProvider(),
            "offline-reviewer": OfflineReviewProvider(),
        },
        policies={
            "mock": ProviderPolicy(
                allowed_modes=frozenset({"plan", "execute"}),
                network_access=False,
                api_credits_required=False,
            ),
            "offline-reviewer": ProviderPolicy(
                allowed_modes=frozenset({"audit", "review"}),
                network_access=False,
                api_credits_required=False,
            ),
        },
    )
    return MissionEngine(
        gateway,
        provider_name="mock",
        stage_providers={
            "review": "offline-reviewer",
            "summarize_evidence": "offline-reviewer",
        },
    )


def run_offline_mission(mission: Mission) -> MissionResult:
    return build_offline_mission_engine().run(mission, mode="execute")
