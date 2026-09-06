"""Deterministic offline reviewer used only to exercise review independence."""

from __future__ import annotations

from .provider import ProviderRequest, ProviderResponse, _digest
from datetime import datetime, timezone


class OfflineReviewProvider:
    name = "offline-reviewer"
    version = "1"
    supported_operations = frozenset({"review", "summarize_evidence"})

    def run(self, request: ProviderRequest) -> ProviderResponse:
        if request.operation not in self.supported_operations:
            raise ValueError(f"unsupported operation: {request.operation}")
        if not request.run_id:
            raise ValueError("run_id is required")
        started = datetime.now(timezone.utc)
        output = (
            f"OFFLINE INDEPENDENT REVIEW\n"
            f"operation={request.operation}\n"
            f"decision=PASS\n"
            f"reviewer_provider={self.name}\n"
            f"network_access=false\n"
            f"api_credits_required=false\n"
            f"final_merge_authority=false"
        )
        finished = datetime.now(timezone.utc)
        return ProviderResponse(
            provider=self.name,
            model=request.model,
            run_id=request.run_id,
            input_hash=_digest(request.prompt),
            output_hash=_digest(output),
            started_at=started.isoformat(),
            finished_at=finished.isoformat(),
            duration_ms=max(0, int((finished - started).total_seconds() * 1000)),
            status="success",
            output=output,
        )
