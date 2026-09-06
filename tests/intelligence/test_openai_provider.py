import pytest

from intelligence.ai_gateway.openai_provider import OpenAIProvider, _extract_output_text


def test_openai_provider_requires_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="OPENAI_API_KEY is required"):
        OpenAIProvider()


def test_extract_output_text_from_responses_payload() -> None:
    payload = {
        "output": [
            {"content": [{"type": "output_text", "text": "hello"}]},
            {"content": [{"type": "output_text", "text": "world"}]},
        ]
    }
    assert _extract_output_text(payload) == "hello\nworld"
