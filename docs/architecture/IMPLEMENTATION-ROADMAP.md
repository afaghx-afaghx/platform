# AFAGHX Implementation Roadmap

## Completed baseline

- Mother architecture defined across five layers.
- Dependency direction established.
- Canonical security/request flow established.
- AFX-CORE designated as the single trust authority.
- Engineering constitution established.
- Authentication foundation ADR added.
- Security context v1 contract added.
- Event contract conventions added.

## Remaining implementation tracks

### Track 1 — AFX-CORE
- Identity model and lifecycle
- Authentication service boundaries
- Password credential hashing
- Session and refresh-token rotation/reuse detection
- MFA/WebAuthn/recovery
- Authorization/RBAC/permission model
- Policy engine contract
- Organization and membership model
- Tenant context resolver
- Audit/consent/trust primitives

### Track 2 — Platform
- API gateway
- Messaging/event backbone
- Notification service
- Search abstraction
- File service abstraction
- Workflow/orchestration
- Billing abstraction
- Observability and integration framework

### Track 3 — Contracts
- OpenAPI governance
- Event schemas and compatibility checks
- Error model
- Pagination/filtering/idempotency conventions

### Track 4 — Domain architecture
- Domain catalog
- Bounded contexts
- Ownership matrix
- Domain-to-CORE dependency rules

### Track 5 — Experience
- Web application shell
- Admin console
- Partner applications
- Authentication/session client integration

### Track 6 — Intelligence
- Data products
- Analytics events
- AI gateway/policy boundary
- Recommendation and automation contracts

### Track 7 — Infrastructure and governance
- Local development environment
- CI quality/security gates
- Container/IaC baseline
- Secrets management integration
- Observability stack
- Backup/restore and disaster recovery
- Release and production approval controls

## Definition of architectural completeness

AFAGHX is not considered production-ready until the security foundation, tenant isolation, contract governance, observability, CI security gates, migration safety, backup/restore, and production approval controls are implemented and tested—not merely documented.
