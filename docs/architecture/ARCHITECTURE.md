# AFAGHX Target Architecture

## 1. Purpose

AFAGHX is an ecosystem platform. Its architecture must support multiple business capabilities without turning the system into a monolith of shared business rules or a collection of isolated applications.

## 2. Architectural layers

### AFX-CORE
The trusted foundation: Identity, Authentication, Authorization, Organizations, Memberships, Tenant Context, RBAC, Policy, Audit, Consent, Trust, Configuration, Feature Flags, and Module Registry.

### AFX-PLATFORM
Reusable infrastructure-level capabilities: Messaging, Notifications, Search, Files, Workflow, Billing, Observability, and Integrations.

### DOMAIN
Bounded business capabilities. Each domain owns its business invariants, application workflows, persistence model, and public contracts.

### INTELLIGENCE
AI, analytics, recommendations, automation, and data products. Intelligence consumes governed contracts/events and does not bypass authorization or domain ownership.

### EXPERIENCE
Web, Admin, Partner, and future mobile or specialized experiences. Experience layers consume approved APIs and contracts rather than accessing domain persistence directly.

## 3. Dependency direction

```text
EXPERIENCE ───────┐
                  ├──> DOMAIN ──> PLATFORM ──> CORE
EXPERIENCE ───────┘

INTELLIGENCE ──> approved APIs / events / data products

CORE -X-> DOMAIN
DOMAIN -X-> another DOMAIN's database
EXPERIENCE -X-> domain database
```

`-X->` means the dependency is prohibited.

## 4. Request security pipeline

```text
Client
  -> Edge/API Gateway
  -> Authentication
  -> Identity
  -> Tenant Context
  -> Membership
  -> RBAC / Permission
  -> Policy
  -> Resource State / Domain Operation
  -> Audit
```

Every protected operation must have a deterministic security context.

## 5. Multi-tenancy

Tenant context is explicit. A request must not infer tenant ownership from arbitrary user-controlled resource fields. Every tenant-scoped resource must carry an enforceable ownership boundary. Cross-tenant operations require explicit policy authorization and auditable intent.

## 6. Service boundaries

A component becomes a separately deployable service only when there is a concrete operational or ownership reason: independent scaling, security boundary, release cadence, fault isolation, data ownership, or organizational ownership. Folder boundaries are not automatically network boundaries.

## 7. Data ownership

Each domain owns its write model and invariants. Shared read models may be produced through events, projections, or governed data products. Direct cross-domain database writes are prohibited.

## 8. Integration model

Synchronous APIs are used when the caller needs an immediate response. Events are used for decoupled workflows, integration, projections, notifications, and downstream processing. Event consumers must tolerate retries and duplicate delivery.

## 9. Contract model

External and inter-service contracts are versioned. Breaking changes require an explicit migration plan. OpenAPI describes synchronous APIs; event schemas describe asynchronous contracts.

## 10. Reliability

Critical operations should be idempotent where retries are possible. Timeouts, retries, circuit breaking, dead-letter handling, correlation IDs, structured logs, metrics, and distributed tracing are architectural concerns rather than optional enhancements.

## 11. Security boundaries

Secrets are externalized. Authentication credentials and signing keys never enter source control. Authorization is deny-by-default. Sensitive actions are auditable. Administrative elevation is explicit and time-bounded where supported.

## 12. Deployment model

Development and staging may iterate rapidly. Production changes require CI validation and an explicit approval gate. Infrastructure is defined as code and environment configuration is separated from application source.

## 13. Evolution rule

New modules must identify: owner, bounded context, data owner, API contract, events, authorization model, tenant scope, dependencies, observability requirements, and migration/rollback strategy before implementation.
