import os
import unittest

from intelligence.ai_gateway.openai_provider import OpenAIProvider, _extract_output_text


class OpenAIProviderTests(unittest.TestCase):
    def test_openai_provider_requires_secret(self):
        previous = os.environ.pop("OPENAI_API_KEY", None)
        try:
            with self.assertRaisesRegex(RuntimeError, "OPENAI_API_KEY is required"):
                OpenAIProvider()
        finally:
            if previous is not None:
                os.environ["OPENAI_API_KEY"] = previous

    def test_extract_output_text_from_responses_payload(self):
        payload = {
            "output": [
                {"content": [{"type": "output_text", "text": "hello"}]},
                {"content": [{"type": "output_text", "text": "world"}]},
            ]
        }
        self.assertEqual(_extract_output_text(payload), "hello\nworld")


if __name__ == "__main__":
    unittest.main()
