# AFAGHX Next-Gen Platform Foundation v1

## Purpose

This document defines the implementation contract for AFAGHX as an ecosystem platform. It is the execution baseline for the next engineering increments and prevents accidental drift toward a storefront, marketplace-only, or service-by-service architecture.

## Mother Architecture

```text
EXPERIENCE
  Web / Admin / Partner / Mobile
        |
DOMAIN <-> PLATFORM
  Business capabilities / shared platform capabilities
        |
     AFX-CORE
  Trust + identity + authorization + tenancy
        |
   PostgreSQL / Redis / Event Backbone
        |
INTELLIGENCE
  Analytics / AI / recommendations / automation
```

The dependency rule is strict:

`EXPERIENCE -> DOMAIN/PLATFORM -> CORE`

Intelligence consumes approved contracts, events and governed data products. CORE never imports business domains.

## Trust Pipeline

Every protected operation follows:

`Authentication -> Identity -> Tenant Context -> Membership -> RBAC/Permission -> Policy -> Resource State -> Audit`

A tenant identifier supplied by a client is never trusted by itself. It becomes trusted context only after server-side membership and organization validation.

## Platform Primitives

### API

- Version all public APIs (`/api/v1`).
- Generate and publish OpenAPI contracts.
- Standardize correlation/request IDs and error envelopes.
- Require idempotency keys for retry-sensitive mutations.
- Apply authentication, authorization, tenant isolation and rate limits at the boundary.

### Event Backbone

Use transactional outbox/inbox patterns.

- Domain state and outbox event are committed in one transaction.
- Events have immutable IDs, explicit type, schema version, aggregate identity and tenant context.
- Consumers record message IDs per consumer and are idempotent.
- Failed delivery moves through retry/backoff and a dead-letter path.
- No domain publishes directly to an external broker before its database transaction commits.

### Data

- Every domain owns its write model.
- Cross-domain access uses explicit APIs, events or governed read models.
- Cache keys, search documents, files and telemetry carrying business context must preserve tenant scope.
- Sensitive data has classification, retention and deletion rules.
- Backup/restore is tested, not merely configured.

### Security

- Short-lived access tokens.
- Rotating refresh credentials with reuse detection.
- MFA/WebAuthn foundation.
- Key IDs (`kid`), JWKS and rotation overlap.
- KMS/HSM-ready key provider abstraction.
- Secure cookie/CSRF strategy for browser sessions where cookies are used.
- Central audit trail with sensitive-field redaction.
- Default-deny authorization.

## Bounded Context Rules

A bounded context must declare:

1. Owner and responsibility.
2. Owned entities and write authority.
3. Public API contract.
4. Published/consumed events.
5. Tenant boundary.
6. Data classification and retention.
7. SLO and failure behavior.
8. Security policy.
9. Extraction criteria if it later becomes a service.

No module may silently become a shared database utility or business dumping ground.

## Deployment Strategy

Start with a modular monolith while preserving service boundaries in code and contracts. Extract a module only when there is a demonstrated need for independent scaling, isolation, compliance, availability, ownership or materially different operational characteristics.

This is deliberate: deployment topology must follow business and operational evidence, not precede it.

## Engineering Quality Gate

A change is eligible for production only after automated validation covers, as applicable:

- type checking/build
- unit tests
- integration tests
- contract tests
- end-to-end tests
- migration safety
- dependency vulnerability scanning
- secret detection
- authorization and tenant-isolation tests
- container/IaC scanning where applicable
- observability and rollback considerations

A green build is necessary but not sufficient for production readiness.

## Definition of Done for the Foundation

The AFAGHX foundation is considered operationally credible only when the trust foundation, tenant isolation, authorization, audit, event delivery, data ownership, observability, recovery and CI security controls are demonstrated by automated tests and repeatable operational procedures.
