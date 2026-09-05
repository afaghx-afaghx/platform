# AFAGHX Master Architecture Specification

**Status:** APPROVED BASELINE  
**Version:** 1.0.0  
**Authority:** AFAGHX Architecture Governance  
**Effective:** 2026-09-05

## 1. Purpose

This document establishes the canonical architectural spine of the AFAGHX Ecosystem Platform. It is the reference for all future implementation, review, CI governance, security controls, and deployment decisions.

The architecture is intentionally stable. Structural changes require an Architecture Decision Record (ADR) and review; teams must not introduce parallel foundations for identity, authorization, tenant context, or trust.

## 2. Canonical layers

```text
EXPERIENCE
    ↓
PLATFORM / DOMAIN APPLICATION BOUNDARIES
    ↓
AFX-CORE
    ↓
OWNED PERSISTENCE / INFRASTRUCTURE
```

Cross-cutting intelligence consumes approved contracts, events, and governed data products; it does not bypass domain or security boundaries.

### AFX-CORE
Identity, User lifecycle, Credentials, Authentication, Sessions, Authorization, Tenant Context, Organization, Membership, RBAC, Policy, Audit, Consent, Trust, Configuration, Feature Flags, Registry.

### AFX-PLATFORM
API, Gateway, Events, Queue, Workflow, Search, Cache, Storage, Notification, Webhooks, Scheduler, Integration, Localization, Currency, Documents.

### DOMAIN
Product, Commerce, Supplier, Factory, Service, Order, Procurement, Logistics, Payment, Partner, Marketing, Advertising, Certification, Contract, Tender, Trade and future bounded contexts.

### INTELLIGENCE
Data Platform, Data Governance, Analytics, BI, AI, Recommendation, Forecasting, Risk, Fraud Detection, Pricing Intelligence, Decision Intelligence.

### EXPERIENCE
Web, Mobile, Admin, Customer, Business, Supplier, Factory, Service Provider, Partner, Marketer, Procurement, Logistics, Finance, Advertising, Product Intelligence, Analytics, AI, Developer, Trust.

## 3. AFX-CORE boundary

User is not a second foundation beside Identity. User lifecycle belongs to Identity:

```text
Identity/
  User/
  Credential/
  IdentityProvider/
  Recovery/
  Session/
  IdentityLifecycle/

Authentication/
  Password/
  WebAuthn/
  MFA/
  Session/
  RefreshToken/
  Recovery/
  Risk/
  StepUp/

Authorization/
  AccessDecision/
  ResourceAuthorization/
  Context/

RBAC/
  Role/
  Permission/
  RolePermission/

Policy/
  PolicyEngine/
  Conditions/
  Rules/
```

The authorization decision model is deny-by-default and evaluates, at minimum:

`Identity + TenantContext + Membership + RBAC/Permission + Policy + ResourceState`.

## 4. HTTP/API security boundary

All protected external traffic follows:

`Client → Gateway → Authentication → Tenant Context → Authorization → Application → Domain → Persistence`

The Gateway is responsible for boundary controls such as authentication enforcement, authorization context propagation, rate limiting, CORS, security headers, request policy, and correlation identifiers. Domain code must never trust caller-supplied tenant or role claims without validation by CORE.

## 5. Data ownership

Every bounded context owns its persistence model. Shared database access is prohibited as an architectural shortcut. Cross-context data access uses explicit application interfaces, versioned contracts, events, or governed data products.

`Domain → Repository/Persistence Boundary → Owned Data`

Experience applications never connect directly to Core or domain databases.

## 6. Security foundation

Credentials are never stored in plaintext. Access and refresh tokens are opaque, short-lived/rotated, and persisted only as digests. Refresh-token reuse is treated as a family compromise and revokes the family. Session revocation must invalidate the associated refresh family.

Future cryptographic material, signing keys, WebAuthn secrets/configuration, and rotation policies are owned by an explicit KMS/secret boundary under infrastructure.

## 7. Shared kernel rule

`packages/shared-kernel` is restricted to stable, domain-neutral primitives. It must not become a hidden business-domain dependency or a dumping ground for application logic.

## 8. Change control

The following are architecture-controlled changes: security authority, dependency direction, tenant isolation model, persistence ownership, public contracts, authentication mechanisms, authorization semantics, cryptographic key management, and deployment trust boundaries. Such changes require an ADR before implementation.

## 9. Baseline acceptance

This specification becomes the architectural baseline for AFAGHX. Implementation may evolve inside these boundaries, but the spine itself is not to be re-invented per feature.
