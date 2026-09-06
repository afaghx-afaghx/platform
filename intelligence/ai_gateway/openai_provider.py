"""OpenAI Responses API provider behind the AFAGHX AI gateway."""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from hashlib import sha256
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .provider import ProviderRequest, ProviderResponse


class OpenAIProvider:
    """Minimal dependency-free OpenAI adapter with explicit failure semantics."""

    name = "openai-codex"
    api_url = "https://api.openai.com/v1/responses"

    def __init__(self, api_key: str | None = None, api_url: str | None = None) -> None:
        self._api_key = api_key or os.getenv("OPENAI_API_KEY")
        self._api_url = api_url or os.getenv("OPENAI_API_URL", self.api_url)
        if not self._api_key:
            raise RuntimeError("OPENAI_API_KEY is required for OpenAIProvider")

    def run(self, request: ProviderRequest) -> ProviderResponse:
        if not request.run_id.strip():
            raise ValueError("run_id is required")
        if not request.prompt.strip():
            raise ValueError("prompt is required")

        started = _utc_now()
        started_clock = time.monotonic()
        model = request.model or os.getenv("AFAGHX_OPENAI_MODEL", "gpt-5.6-luna")
        input_hash = _digest("|".join((request.operation, request.prompt, request.run_id, model)))
        payload = {
            "model": model,
            "input": request.prompt,
            "metadata": {
                "afaghx_run_id": request.run_id,
                "afaghx_operation": request.operation,
            },
        }
        req = Request(
            self._api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urlopen(req, timeout=120) as response:  # nosec B310 - fixed HTTPS API boundary
                body = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"OpenAI API request failed: HTTP {exc.code}: {detail[:500]}") from exc
        except URLError as exc:
            raise RuntimeError(f"OpenAI API transport failed: {exc.reason}") from exc

        output = _extract_output_text(body)
        finished = _utc_now()
        return ProviderResponse(
            provider=self.name,
            model=model,
            run_id=request.run_id,
            input_hash=input_hash,
            output_hash=_digest(output),
            started_at=started.isoformat(),
            finished_at=finished.isoformat(),
            duration_ms=max(0, int((time.monotonic() - started_clock) * 1000)),
            status="success",
            output=output,
        )


def _extract_output_text(body: dict) -> str:
    if isinstance(body.get("output_text"), str):
        return body["output_text"]
    chunks: list[str] = []
    for item in body.get("output", []):
        for content in item.get("content", []):
            text = content.get("text")
            if isinstance(text, str):
                chunks.append(text)
    if chunks:
        return "\n".join(chunks)
    raise RuntimeError("OpenAI response contained no text output")


def _digest(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)
