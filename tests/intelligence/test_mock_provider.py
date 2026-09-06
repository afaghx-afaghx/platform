import unittest

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
            self.assertEqual(response.input_hash.__len__(), 64)
            self.assertEqual(response.output_hash.__len__(), 64)
            self.assertIn("network_access=false", response.output)
            self.assertIn("api_credits_required=false", response.output)

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


if __name__ == "__main__":
    unittest.main()
