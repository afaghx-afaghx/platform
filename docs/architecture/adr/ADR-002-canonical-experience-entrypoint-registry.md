# ADR-002 — Canonical Experience Entrypoint Registry and API Spine

**Status:** PROPOSED  
**Date:** 2026-10-04  
**Authority:** AFAGHX Architecture Governance

## Context

AFAGHX separates its seven governed architecture layers from its public Experience entrypoints. The previous registry described 17 total entries, but the canonical ecosystem structure is one main ecosystem site plus 17 module entrypoints.

The previous registry also used `service.afaghx.com`; the canonical host is `services.afaghx.com`.

## Decision

1. Canonical public entrypoint topology:
   - 1 main ecosystem entrypoint: `www.afaghx.com`
   - 17 module entrypoints
   - total top-level ecosystem entrypoints: 18

2. The 17 module entrypoints are the 16 role/specialized Experience applications plus the shared `api.afaghx.com` platform/API spine.

3. `api.afaghx.com` is **platform-spine**, not a DOMAIN bounded context and not an independent authentication authority.

4. AFX-CORE is the sole authority for identity, authentication, authorization, tenant context, membership, policy, audit, consent and trust primitives.

5. AFX-EXPERIENCE is presentation/application only and never connects directly to PostgreSQL.

6. Canonical Services host: `services.afaghx.com`. `service.afaghx.com` is legacy/migration debt and must not be introduced into new code.

7. Registry cardinality, uniqueness and classification are machine-enforced before merge.

## Canonical request flow

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State`

## Canonical dependency direction

`EXPERIENCE → PLATFORM / DOMAIN → CORE`

## Reference runtime

```text
User / Client
     |
     v
AFX-EXPERIENCE
     |
     v
api.afaghx.com
     |
     v
Gateway / Enforcement Boundary
     |
     v
AFX-CORE security context
     |
     +--> PLATFORM capabilities
     +--> DOMAIN business truth
     |
     v
Persistent / governed data
```

## Consequences

- The 17-versus-18 ambiguity is eliminated.
- The API spine is explicit without being misclassified as business truth.
- Services has one canonical public host.
- Architecture gates can reject registry drift deterministically.

## Non-goals

This ADR does not approve:
- microservices migration;
- a new database per module;
- a new authentication provider;
- new domain ownership;
- direct production deployment;
- bypassing the existing FINAL GATE.

## Evidence contract

The authoritative machine-readable registry is:

`experience/module-registry.json`

A declaration is not runtime proof. Production readiness still requires implementation, tests, CI, security, deployment and runtime evidence.
