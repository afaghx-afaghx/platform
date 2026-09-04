# AFAGHX Target Ecosystem Architecture v1

## Purpose
This document is the canonical target-state architecture for AFAGHX. It defines boundaries, dependency direction, trust ownership, platform contracts, and the conditions under which future domains may be added without architectural migration.

## 1. Mother Architecture

AFAGHX is an ecosystem platform, not a storefront or a collection of coupled applications.

```text
EXPERIENCE
   ↓
DOMAIN + AFX-PLATFORM
   ↓
AFX-CORE
```

Intelligence consumes governed data products and approved events. Infrastructure supports all layers but does not own business semantics.

## 2. AFX-CORE — Trust Foundation

AFX-CORE is the single trust authority for:
- Identity
- Authentication and credential lifecycle
- Security Context
- Organization
- Tenant Context
- Membership
- RBAC and Policy
- Consent and privacy controls
- Audit and security events
- Configuration and feature flags
- Module registry

No domain may create a parallel authentication or authorization authority.

## 3. AFX-PLATFORM — Shared Capabilities

AFX-PLATFORM owns reusable technical capabilities:
- API gateway and versioning
- canonical error contract
- request correlation and idempotency
- event backbone, Outbox and Inbox
- retry, DLQ and replay
- notifications
- search abstraction and projections
- file/object storage boundary and malware-scanning integration
- workflow orchestration
- external integrations
- observability primitives

Platform services must remain domain-neutral.

## 4. Domain Layer

Every business capability is a bounded context with explicit ownership. Domains own their aggregates, business rules, APIs and domain events. Cross-domain database access is prohibited.

A domain may request authorization from AFX-CORE but may not redefine the trust model.

## 5. Intelligence and Data

Analytics and AI operate only on governed data products and explicit contracts. Sensitive data classification, retention and access policy remain enforceable at the source and consumption boundaries.

High-impact automation requires policy evaluation and, where applicable, human approval.

## 6. Experience Layer

Web, admin, partner and mobile applications consume public contracts. UI authorization is advisory; server-side authorization is authoritative. Tenant context, permissions and available capabilities must be reflected in navigation without becoming a security boundary.

## 7. Protected Request Contract

Every protected request follows:

```text
Authentication
 → Identity
 → Tenant / Organization Context
 → Membership
 → RBAC / Permission
 → Policy
 → Resource State
 → Audit
```

Default decision is deny.

## 8. Tenant Isolation

Organization identifies the business actor. Tenant defines the security/data isolation boundary. Client-supplied tenant identifiers are untrusted until validated against authenticated membership and policy.

Tenant scope must survive all applicable layers: API, application, database, cache, messaging, search, files and observability.

## 9. Event Contract

All externally consumed events are explicit, versioned envelopes. Producers use transactional Outbox semantics where state and event publication must be atomic. Consumers use Inbox/idempotency controls where duplicate delivery is possible.

Required event properties include stable event identity, event type, schema version, aggregate identity, occurrence time, tenant scope when applicable and validated payload.

## 10. Deployment Model

The initial production topology is a modular monolith with hard module boundaries. Service extraction is an operational decision made only when independent scaling, fault isolation, compliance, ownership or availability requirements justify it.

The architecture must therefore be service-extraction-ready without forcing premature distributed-system complexity.

## 11. Non-Negotiable Engineering Rules

1. No secrets, private keys or production credentials in source control.
2. No direct domain-to-domain database ownership violations.
3. No client-controlled tenant trust.
4. No implicit authorization defaults.
5. No unversioned public contracts.
6. No event consumer without duplicate/failure semantics.
7. No production readiness claim without automated evidence.
8. No irreversible architecture change without an ADR.
9. Security controls are enforced server-side.
10. Observability, auditability and tenant boundaries are cross-cutting requirements.

## 12. Definition of Done

A foundation capability is complete only when its implementation, contract, automated tests, failure behavior, security controls and operational evidence exist. Documentation alone is not completion.

The platform is production-ready only after Gates 01–06 have executable evidence, including trust controls, integration/E2E security tests, migration safety, observability, backup/restore, DR/BCP and release controls.
