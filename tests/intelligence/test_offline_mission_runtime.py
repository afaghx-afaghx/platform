import unittest

from intelligence.mission.engine import Mission
from intelligence.mission.offline_runtime import run_offline_mission


class OfflineMissionRuntimeTests(unittest.TestCase):
    def test_full_role_separated_pipeline(self):
        result = run_offline_mission(
            Mission(
                mission_id="MISSION-003-OFFLINE",
                objective="Prove the AFAGHX governed mission lifecycle without external API access.",
                run_id="mission-003-test",
            )
        )
        self.assertEqual(result.status, "success")
        self.assertEqual(result.plan.provider, "mock")
        self.assertEqual(result.implementation.provider, "offline-implementer")
        self.assertEqual(result.test.provider, "offline-reviewer")
        self.assertEqual(result.evidence.provider, "offline-reviewer")
        self.assertNotEqual(result.implementation.provider, result.test.provider)
        self.assertIn("PASS", result.test.output)
        self.assertIn("final_merge_authority=false", result.test.output)
        self.assertEqual(result.implementation.model, "offline-v1")
        self.assertEqual(result.test.model, "offline-v1")


if __name__ == "__main__":
    unittest.main()
