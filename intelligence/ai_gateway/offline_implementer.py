"""Deterministic offline implementer for end-to-end mission rehearsal."""

from __future__ import annotations

from datetime import datetime, timezone

from .provider import ProviderRequest, ProviderResponse, _digest


class OfflineImplementer:
    name = "offline-implementer"
    version = "1"
    supported_operations = frozenset({"implement"})

    def run(self, request: ProviderRequest) -> ProviderResponse:
        if request.operation not in self.supported_operations:
            raise ValueError(f"unsupported operation: {request.operation}")
        if not request.run_id:
            raise ValueError("run_id is required")
        started = datetime.now(timezone.utc)
        output = (
            "OFFLINE IMPLEMENTATION\n"
            "decision=PASS\n"
            "change_type=deterministic_rehearsal\n"
            "tests_expected=true\n"
            "merge_authority=false\n"
            "network_access=false\n"
            "api_credits_required=false"
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
