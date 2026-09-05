# AFAGHX Engineering Constitution

## Mission

Build AFAGHX as a secure, multi-tenant, extensible Ecosystem Platform with stable architectural boundaries, explicit ownership, reproducible operations, and evidence-backed security.

## Canonical architecture

AFAGHX is governed by the five-layer baseline:

1. **AFX-CORE** — Identity, User lifecycle, Credentials, Authentication, Authorization, Organization, Membership, Tenant Context, RBAC, Policy, Audit, Consent, Trust, Configuration, Feature Flags, Registry.
2. **AFX-PLATFORM** — API, Gateway, Events, Queue, Workflow, Search, Cache, Storage, Notification, Webhooks, Scheduler, Integration, Localization, Currency, Documents.
3. **DOMAIN** — independently bounded business capabilities with explicit data ownership.
4. **INTELLIGENCE** — AI, analytics, recommendations, automation and governed data products.
5. **EXPERIENCE** — web, mobile, admin and role-specific user-facing applications.

The canonical request flow is:

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State`

## Non-negotiable rules

1. AFX-CORE is the single authority for identity, authentication, authorization, tenant context, membership, policy, audit, consent and trust primitives.
2. User lifecycle belongs to Identity; there is no parallel `core/User` authority.
3. No domain service may introduce an independent authentication authority.
4. Every protected request must resolve and validate security context before resource access.
5. Tenant isolation is mandatory at applicable API, application, data, cache, messaging, search, file and observability boundaries.
6. Domain ownership is explicit; domains do not access other domains' persistence directly.
7. Experience applications never connect directly to Core or domain databases.
8. Public APIs and events are explicit, versioned contracts.
9. Events must be designed for idempotent consumption where duplicate delivery is possible.
10. Secrets, credentials, tokens, private keys and production configuration values never enter source control.
11. Cryptographic material and key rotation belong behind an explicit KMS/secrets boundary.
12. Shared-kernel contains only stable, domain-neutral primitives.
13. Security failures fail closed.
14. Production changes require automated validation, evidence collection and explicit approval.
15. Destructive migrations require rollback strategy and explicit review.
16. Structural architecture changes require an ADR before implementation.

## Dependency direction

`EXPERIENCE → PLATFORM / DOMAIN → CORE`

`INTELLIGENCE → approved contracts / events / governed data products`

CORE must not depend on business domains.

## Security baseline

Authentication credentials are protected with memory-hard password hashing. Access tokens are short-lived and refresh tokens are rotated. Persisted tokens are represented by digests rather than raw bearer values. Refresh-token reuse revokes the compromised family. Session revocation invalidates its refresh family. Authorization is deny-by-default and tenant-aware.

## Evidence-first engineering

A feature is not considered complete merely because code exists. Completion requires relevant automated tests, CI evidence, security checks, and reviewable documentation. No GREEN status may be asserted without actual evidence.

See:
- `docs/architecture/AFX-MASTER-ARCH-001.md`
- `docs/architecture/dependency-rules.md`
- `docs/architecture/system-context.md`
- `docs/architecture/adr/ADR-001-canonical-architecture-baseline.md`
