# AFAGHX Dependency Rules

## Allowed direction

```text
EXPERIENCE → PLATFORM / DOMAIN → CORE
INTELLIGENCE → Contracts / Events / Governed Data Products
CORE → no business DOMAIN dependency
```

## Rules

1. CORE is the only authority for identity, authentication, tenant context, membership, authorization, policy, audit, consent and trust primitives.
2. No domain may implement or own a competing authentication authority.
3. Experience code accesses data only through approved APIs/application boundaries.
4. Domains own their business rules and persistence. No direct cross-domain table access.
5. Platform capabilities are consumed through explicit interfaces; platform code must not absorb domain policy.
6. Intelligence reads approved data products/events/contracts and must not mutate transactional domain state without an explicit application command boundary.
7. Shared-kernel dependencies must remain domain-neutral and acyclic.
8. Public APIs and events are versioned contracts. Breaking changes require explicit migration and ADR.
9. Tenant context is mandatory for tenant-scoped operations and cannot be reconstructed from untrusted request fields after authorization.
10. Security-sensitive operations must emit structured audit events without secrets or raw tokens.
11. Persistence implementations are hidden behind repository/application boundaries.
12. Infrastructure concerns (KMS, secrets, network, observability, deployment) are injected through explicit ports; business code does not embed environment-specific credentials.

## Forbidden shortcuts

- Experience → database
- Domain → another domain's tables
- Domain → private token/session store
- Domain → independent user/identity store
- Client-supplied role/tenant → authorization decision without CORE validation
- Shared-kernel → business workflow
- Intelligence → transactional database bypass

## Enforcement

These rules are architectural requirements. CI and architecture review should progressively automate detection of forbidden imports, direct database access, contract drift, secret exposure, and unauthorized boundary crossings.
