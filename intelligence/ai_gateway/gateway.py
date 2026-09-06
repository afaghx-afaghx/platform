"""Minimal governed gateway for selecting and invoking providers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from .provider import AIProvider, ProviderRequest, ProviderResponse


@dataclass(frozen=True)
class ProviderPolicy:
    allowed_modes: frozenset[str]
    network_access: bool
    api_credits_required: bool


class AIGateway:
    """Routes operations through an explicit provider policy boundary."""

    def __init__(
        self,
        providers: Mapping[str, AIProvider],
        policies: Mapping[str, ProviderPolicy],
    ) -> None:
        self._providers = dict(providers)
        self._policies = dict(policies)

    def run(
        self,
        *,
        provider_name: str,
        mode: str,
        request: ProviderRequest,
    ) -> ProviderResponse:
        if provider_name not in self._providers:
            raise ValueError(f"unknown provider: {provider_name}")
        if provider_name not in self._policies:
            raise ValueError(f"missing provider policy: {provider_name}")
        policy = self._policies[provider_name]
        if mode not in policy.allowed_modes:
            raise PermissionError(
                f"provider {provider_name} is not allowed in mode {mode}"
            )
        provider = self._providers[provider_name]
        return provider.run(request)
