# ADR-0005 — Policy Decision Contract

## Status
Accepted for Gate 01 implementation.

## Context
AFAGHX authorization must evolve beyond a direct role-to-permission lookup without allowing business domains to implement their own security semantics. A stable decision contract is required so controllers, domains, audit, observability and future policy engines can consume the same result.

## Decision
AFX-CORE owns the authorization decision contract. Every protected authorization evaluation returns:

- `decision`: `allow` or `deny`
- `reasonCode`: stable machine-readable reason
- `policyVersion`: explicit policy version
- `decisionId`: unique decision identifier
- `evaluatedAt`: decision timestamp

Authorization input may include authenticated security context, action, resource type, resource identifier, authentication assurance and policy context. Policy context is server-derived whenever possible; client input is untrusted until validated.

Default behavior is deny. Missing policy, unknown permission, tenant/membership mismatch, insufficient assurance and resource-policy mismatch are deny conditions.

## Consequences
- Domains request authorization; they do not become authorization authorities.
- Policy versions can evolve without changing controller contracts.
- Decisions can be correlated with audit and telemetry using `decisionId`.
- Resource-level rules can be added without redesigning the security context.
- Future policy engines can replace the current RBAC implementation behind the same contract.

## Security requirements
- No implicit allow.
- No client-controlled tenant authority.
- No cross-tenant resource lookup before tenant authorization.
- Denials must not disclose sensitive authorization internals to untrusted clients.
- Authorization audit records must be sanitized and best-effort.

## Implementation boundary
Current implementation uses PostgreSQL-backed RBAC as the first policy adapter. It is intentionally not treated as the final policy engine. The next Gate 01 increments must add policy predicates, assurance requirements and automated resource/tenant isolation tests behind this contract.
