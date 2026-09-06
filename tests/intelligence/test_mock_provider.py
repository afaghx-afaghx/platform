import unittest

from intelligence.ai_gateway.gateway import AIGateway, ProviderPolicy
from intelligence.ai_gateway.provider import MockProvider, ProviderRequest


class MockProviderTests(unittest.TestCase):
    def test_all_contract_operations_execute_offline(self):
        provider = MockProvider()
        for operation in ("plan", "implement", "review", "summarize_evidence"):
            response = provider.run(
                ProviderRequest(
                    operation=operation,
                    prompt="MISSION-001 deterministic contract test",
                    run_id="mission-001-test",
                )
            )
            self.assertEqual(response.provider, "mock")
            self.assertEqual(response.status, "success")
            self.assertEqual(len(response.input_hash), 64)
            self.assertEqual(len(response.output_hash), 64)
            self.assertIn("network_access=false", response.output)
            self.assertIn("api_credits_required=false", response.output)
            self.assertTrue(response.started_at.endswith("+00:00"))
            self.assertTrue(response.finished_at.endswith("+00:00"))

    def test_output_is_deterministic(self):
        provider = MockProvider()
        request = ProviderRequest("plan", "same input", "run-1")
        first = provider.run(request)
        second = provider.run(request)
        self.assertEqual(first.input_hash, second.input_hash)
        self.assertEqual(first.output_hash, second.output_hash)
        self.assertEqual(first.output, second.output)

    def test_unknown_operation_fails_closed(self):
        with self.assertRaises(ValueError):
            MockProvider().run(ProviderRequest("delete", "x", "run-1"))

    def test_gateway_routes_to_mock_provider(self):
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
        response = gateway.run(
            provider_name="mock",
            mode="plan",
            request=ProviderRequest("plan", "MISSION-001 gateway test", "run-gateway"),
        )
        self.assertEqual(response.provider, "mock")
        self.assertEqual(response.status, "success")

    def test_gateway_blocks_mock_execute_mode(self):
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
        with self.assertRaises(PermissionError):
            gateway.run(
                provider_name="mock",
                mode="execute",
                request=ProviderRequest("implement", "x", "run-blocked"),
            )


if __name__ == "__main__":
    unittest.main()
