"""Provider abstraction for the AFAGHX governed AI gateway."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
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
    started_at: str
    finished_at: str
    duration_ms: int
    status: str
    output: str


class AIProvider(Protocol):
    name: str

    def run(self, request: ProviderRequest) -> ProviderResponse:
        """Execute one governed provider operation."""


def _digest(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class MockProvider:
    """Offline provider with deterministic output and no external I/O."""

    name = "mock"
    supported_operations = frozenset({"plan", "implement", "review", "summarize_evidence"})

    def run(self, request: ProviderRequest) -> ProviderResponse:
        started = _utc_now()
        if request.operation not in self.supported_operations:
            raise ValueError(f"unsupported provider operation: {request.operation}")
        if not request.run_id.strip():
            raise ValueError("run_id is required")

        input_hash = _digest(
            "|".join((request.operation, request.prompt, request.run_id, request.model))
        )
        output = (
            "MOCK_EXECUTION\n"
            f"provider=mock\n"
            f"operation={request.operation}\n"
            f"run_id={request.run_id}\n"
            f"model={request.model}\n"
            f"input_hash={input_hash}\n"
            "decision=PASS\n"
            "network_access=false\n"
            "api_credits_required=false\n"
        )
        finished = _utc_now()
        return ProviderResponse(
            provider=self.name,
            model=request.model,
            run_id=request.run_id,
            input_hash=input_hash,
            output_hash=_digest(output),
            started_at=started.isoformat(),
            finished_at=finished.isoformat(),
            duration_ms=max(0, int((finished - started).total_seconds() * 1000)),
            status="success",
            output=output,
        )
