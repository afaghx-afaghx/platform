import unittest

from intelligence.ai_gateway.gateway import AIGateway, ProviderPolicy
from intelligence.ai_gateway.provider import MockProvider
from intelligence.mission.engine import Mission, MissionEngine


class MissionEngineTests(unittest.TestCase):
    def test_mission_engine_runs_full_pipeline_in_offline_audit_mode(self):
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

        result = engine.run(mission, mode="audit")

        self.assertEqual(result.status, "success")
        self.assertEqual(result.plan.status, "success")
        self.assertEqual(result.implementation.status, "success")
        self.assertEqual(result.test.status, "success")
        self.assertEqual(result.evidence.status, "success")


if __name__ == "__main__":
    unittest.main()
