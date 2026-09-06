"""Provider abstraction for the AFAGHX governed AI gateway.

This module is deliberately dependency-free. The mock provider gives CI a
real, deterministic execution path without network access or API credits.
"""

from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from time import monotonic
from typing import Protocol


@dataclass(frozen=True)
class ProviderRequest:
    operation: str
    prompt: str
    run_id: str
    model: str = "mock-v1"


@dataclass(frozen=True)
class ProviderResponse:
    provider: str
    model: str
    run_id: str
    input_hash: str
    output_hash: str
    started_at: float
    finished_at: float
    status: str
    output: str


class AIProvider(Protocol):
    name: str

    def run(self, request: ProviderRequest) -> ProviderResponse:
        """Execute one governed provider operation."""


def _digest(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


class MockProvider:
    """Offline provider with deterministic output and no external I/O."""

    name = "mock"

    def run(self, request: ProviderRequest) -> ProviderResponse:
        started = monotonic()
        if request.operation not in {"plan", "implement", "review", "summarize_evidence"}:
            raise ValueError(f"unsupported provider operation: {request.operation}")
        if not request.run_id.strip():
            raise ValueError("run_id is required")

        input_hash = _digest(
            "|".join((request.operation, request.prompt, request.run_id, request.model))
        )
        output = (
            f"MOCK_EXECUTION\n"
            f"provider=mock\n"
            f"operation={request.operation}\n"
            f"run_id={request.run_id}\n"
            f"model={request.model}\n"
            f"input_hash={input_hash}\n"
            f"decision=PASS\n"
            f"network_access=false\n"
            f"api_credits_required=false\n"
        )
        finished = monotonic()
        return ProviderResponse(
            provider=self.name,
            model=request.model,
            run_id=request.run_id,
            input_hash=input_hash,
            output_hash=_digest(output),
            started_at=started,
            finished_at=finished,
            status="success",
            output=output,
        )
