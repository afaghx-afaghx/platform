from intelligence.ai_gateway.gateway import AIGateway, ProviderPolicy
from intelligence.ai_gateway.provider import MockProvider
from intelligence.mission.engine import Mission, MissionEngine


def test_mission_engine_runs_full_pipeline_with_mock_in_audit_safe_mode() -> None:
    gateway = AIGateway(
        providers={"mock": MockProvider()},
        policies={
            "mock": ProviderPolicy(
                allowed_modes=frozenset({"plan", "audit"}),
                network_access=False,
                api_credits_required=False,
            )
        },
    )
    engine = MissionEngine(gateway, provider_name="mock")
    mission = Mission(
        mission_id="MISSION-TEST-001",
        objective="Validate the governed mission pipeline.",
        run_id="test-run-001",
    )

    # Mock cannot execute; this verifies the pipeline remains governed and offline.
    result = engine.run(mission, mode="audit")

    assert result.status == "success"
    assert result.plan.status == "success"
    assert result.implementation.status == "success"
    assert result.test.status == "success"
    assert result.evidence.status == "success"
