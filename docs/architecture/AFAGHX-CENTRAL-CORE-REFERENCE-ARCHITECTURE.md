# AFAGHX Central Core — Reference Architecture

**Document ID:** AFX-CORE-REF-001  
**Status:** Proposed implementation baseline — requires independent Architecture and Security approval  
**Scope:** Central platform core, security boundary, domain integration, and Experience-to-API contract  
**Repository:** `afaghx-afaghx/platform`

## 1. Executive decision

AFAGHX shall use a **modular monolith + API-first + event-ready** deployment baseline until measured operational needs justify extracting an independently deployable service. Modules must have explicit ownership and enforceable contracts from the beginning; microservices are not a prerequisite for modularity.

AFX-CORE is the single source of truth for platform identity and trust primitives. It is **not** a universal business-data store and must not absorb the private business rules of individual domains.

This document is a reference architecture, not evidence that every capability is already implemented or production-ready.

## 2. Architecture at a glance

### Compile-time dependency direction

```text
EXPERIENCE
   | approved API client / versioned contracts
   v
PLATFORM API / GATEWAY
   | verified immutable SecurityContext + explicit command/query
   v
DOMAIN APPLICATION BOUNDARIES
   | domain-owned repositories and transactions
   v
DOMAIN-OWNED PERSISTENCE

CORE provides identity, authorization, tenant context, policy,
audit, consent and trust capabilities through explicit contracts.

INTELLIGENCE consumes approved contracts, events and governed data
products; it does not bypass transactional domain boundaries.
```

Dependency rules and request flow are different concepts. The compile-time direction must remain acyclic: Experience depends on API contracts/client libraries; Gateway and domain adapters depend on Core contracts; Core must not import business-domain implementations. At runtime, a request is authenticated and authorized before protected domain state is accessed.

### Protected request flow

```text
HTTP Request
  -> Edge / API Gateway
  -> Authentication and session/token validation
  -> Identity resolution
  -> Tenant + organization context resolution
  -> Membership and account-state checks
  -> RBAC permission evaluation
  -> Policy evaluation (resource, action, context)
  -> Domain command/query with immutable SecurityContext
  -> Domain-owned application service and persistence
  -> Audit/outbox record where required
  -> Versioned API response
```

No protected domain handler may skip the Gateway enforcement boundary or invent a separate authorization authority.

## 3. Core bounded contexts and ownership

| Core capability | Owns | Must not own |
|---|---|---|
| Identity | Stable subject identity and lifecycle | Product, order, supplier or campaign business records |
| Authentication | Credential verification, sessions/tokens, recovery orchestration | Domain-specific permissions |
| Organization | Organization identity and lifecycle | Domain transaction data |
| Membership | Subject-to-organization relationship and membership state | Business approval workflows outside its contract |
| Tenant Context | Validated tenant/org context and resolution rules | Trusting caller-supplied tenant IDs |
| Authorization / RBAC | Roles, permissions and role assignment rules | Domain resource state |
| Policy | Contextual allow/deny decisions and policy versions | Business persistence owned by domains |
| Audit | Structured security and governance events | Passwords, raw bearer tokens or unnecessary sensitive payloads |
| Consent | Recorded consent, purpose and withdrawal state | Unrelated product analytics |
| Trust Foundation | Shared verification/trust primitives and explicit trust state | Unsupported claims that a supplier or capability is verified |
| Configuration / Feature Flags | Governed runtime configuration and capability switches | Secret values committed to source |
| Module Registry | Module identity, ownership, contract/version and lifecycle metadata | Runtime authority bypasses |
| API Governance | API version and compatibility policy | Domain business logic |

Each bounded context must have an accountable owner, public contract, persistence ownership decision, tests and observability expectations before it is treated as a completed capability.

## 4. Security invariants

1. **Default deny.** Missing, ambiguous, stale or failed authentication/authorization context denies protected access.
2. **Gateway is the enforcement boundary.** A domain route cannot provide an alternate path around authentication, permission checks or policy evaluation.
3. **Immutable SecurityContext.** After validation, downstream domain handlers receive a minimal immutable context containing only verified subject, tenant/organization, membership and authorization evidence needed for the operation. They do not receive raw bearer tokens.
4. **No caller-controlled tenant authority.** A request-body or query-string `tenantId` is never accepted as proof of ownership. A mismatch is rejected and recorded through a safe audit event.
5. **Permission and policy are separate checks.** RBAC answers whether the principal has a capability; policy evaluates the resource and context. Both must pass where required.
6. **Resource-state checks remain in the domain.** Core/Gateway authorization does not replace domain invariants, ownership checks or valid state-transition rules.
7. **Audit is security-safe.** Record actor/context, action, outcome, correlation ID and relevant resource identifiers; exclude credentials, raw tokens and unnecessary personal data.
8. **Fail closed on required dependencies.** If a required authorization, tenant, policy or persistence dependency is unavailable, protected mutations must not silently continue.
9. **Least privilege.** Service identities and CI workflows receive only the permissions required for their scope.
10. **Secrets are externalized.** Signing keys, KMS material, database credentials and provider secrets are injected through approved secret-management mechanisms and never checked into Git.

## 5. Contracts and shared kernel

- Contracts are versioned, validated at boundaries and owned by the provider that defines their semantics.
- The shared kernel contains only small, stable, domain-neutral primitives. It must not become a dumping ground for workflows, repositories or business rules.
- Public API schemas, error formats, event envelopes and compatibility rules must be testable in CI.
- Breaking contract changes require an explicit migration plan and an Architecture Decision Record (ADR).
- Consumers must not import private implementation files from another module.
- Avoid circular imports and hidden runtime coupling. Enforce dependency rules with automated checks where practical.

## 6. Domain and data ownership

- Each domain owns its business rules, state transitions, repository/application boundary and persistence schema.
- No domain reads or writes another domain's tables directly.
- Cross-domain operations use explicit application commands, versioned APIs or events; they do not use shared database shortcuts.
- Experience code never connects directly to a production database.
- Financial amounts use exact decimal representations and database numeric types, not binary floating-point arithmetic.
- Idempotency, tenant isolation, concurrency, audit/outbox atomicity and migration safety must be tested for operations that require them.
- Read models and analytics may be derived from approved events/data products; they must not become an ungoverned second source of truth.

## 7. Events and asynchronous work

The platform is event-ready, but an event broker is not assumed to exist merely because contracts are defined.

- Use versioned event envelopes with event ID, event type/version, occurrence time, producer, correlation/causation IDs and validated metadata.
- For changes that must publish reliably, write the business change and outbox event in the same database transaction.
- Assume at-least-once delivery unless stronger semantics are explicitly implemented and proven; consumers must be idempotent.
- Apply bounded retries, dead-letter handling, operational alerts and replay controls.
- Events are facts, not remote procedure calls or a replacement for synchronous authorization.
- Never put credentials or unnecessary sensitive payloads in events.

## 8. Experience and API boundary

- Experience applications use the canonical API client and versioned endpoints; they do not reimplement identity, permission or policy decisions.
- UI visibility is not authorization. Every protected operation is independently checked server-side.
- Authentication state, unauthorized (401), forbidden (403), expired session, validation failure and service-unavailable states need consistent handling.
- Keep user-specific experiences separate by account context (for example, personal buyer versus organization buyer). A UI filter is not a data-isolation control; server-side tenant and resource authorization is mandatory.
- Demonstration catalogs, preview forms and target-architecture diagrams must be explicitly disclosed and never presented as live services without operational evidence.
- The homepage must communicate the broader AFAGHX ecosystem—industry, commerce, services, procurement, business network, intelligence and international trade—without implying that every module is live.

## 9. Deployment and evolution strategy

### Initial deployment

Use a modular monolith with isolated module boundaries and a single canonical API/Gateway enforcement path. Keep deployment and data boundaries explicit even while modules share a deployable artifact.

### Extract a service only when justified

A module may be considered for independent deployment only when there is measured need (scaling, isolation, reliability or release independence), a stable contract, an accountable owner, production telemetry, failure/retry design, security review, data-ownership plan and migration/rollback strategy.

Do not create microservices solely to make the architecture diagram look distributed.

## 10. Required verification and evidence

A capability is not complete because its directory, interface or documentation exists. For each security-critical path, require:

- Unit and contract tests for allow/deny behavior and malformed context.
- Integration tests with the real persistence mechanism used by that path.
- Negative tests for missing credentials, invalid/expired sessions, insufficient permission, policy denial, tenant spoofing and cross-tenant access.
- Concurrency/idempotency tests where operations can be retried or raced.
- CI on the exact candidate commit, with artifacts and commit SHA recorded.
- Independent Architecture/Security review for material boundary changes.
- Deployment and recovery evidence before a production-readiness claim.

Use truth states precisely: **IMPLEMENTED** means code exists; **TESTED** means defined checks passed on the exact SHA; **PROVEN** requires the repository's full evidence contract and independent acceptance; **PRODUCTION_READY** additionally requires environment, operational, security and release gates. No state may be promoted by a successful build alone.

## 11. Implementation sequence

1. Reconcile this reference with the currently governing architecture and record any conflict as an ADR rather than silently overriding authority.
2. Inventory actual Core/Gateway modules, imports, contracts and persistence owners.
3. Map each protected route to its authentication, tenant, RBAC, policy, audit and domain-state checks.
4. Close security and tenant-isolation negative tests before adding new business domains.
5. Enforce API/event compatibility and forbidden-dependency checks in CI.
6. Establish operational evidence for secrets/KMS, workload identity, TLS/edge, monitoring, backup/restore and incident response before production claims.
7. Approve independent Architecture and Security review; keep changes in a pull request until all required gates pass.

## 12. Acceptance checklist

- [ ] Architecture Governance confirms this document does not conflict with the current master specification.
- [ ] Every Core capability has an owner and explicit contract.
- [ ] Gateway is the only protected request enforcement boundary.
- [ ] Domain handlers receive verified immutable SecurityContext, not raw credentials.
- [ ] Tenant spoofing and cross-tenant access are denied and tested.
- [ ] Domain persistence ownership and cross-domain boundaries are enforced.
- [ ] API/event contracts are versioned and checked in CI.
- [ ] Required workflows pass on the exact final SHA.
- [ ] Security and Architecture reviews are independent of the implementation author.
- [ ] Production-readiness claims are backed by environment-specific evidence.

**Disposition:** Reference proposal only. This document does not itself implement controls, approve a release, or establish production readiness.
