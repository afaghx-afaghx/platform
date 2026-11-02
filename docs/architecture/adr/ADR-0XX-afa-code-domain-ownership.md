# ADR — AFA CODE Domain Ownership and Persistence Boundaries

- **Status:** Proposed; requires architecture-owner approval
- **Date:** 2026-11-03
- **Decision scope:** Product identity, organizations, facilities, external identifiers, market profiles, lots, shipments, and traceability events

## Context

The AFA CODE proposal spans multiple AFAGHX bounded contexts. The master architecture requires exactly one authoritative owner for every important entity, forbids cross-domain persistence access, and centralizes identity, organization/membership context, authorization, policy, and audit primitives in AFX-CORE. A single AFA CODE database owning every entity would violate those boundaries.

## Proposed ownership matrix

| Information | Authoritative owner | AFA CODE integration rule |
|---|---|---|
| User, organization identity, membership, tenant context, RBAC, policy, audit primitives | AFX-CORE | Consume approved CORE contracts; do not create parallel identity/authentication |
| Facility identity and factory profile | Factory domain | Product domain stores a stable facility reference and verifies relationships through a factory-domain contract |
| Product, variant, trade item, product external-ID association, product-market profile | Product domain | Product domain owns its records and their lifecycle |
| Commercial offer, seller price, availability | Commerce domain | Link to product/trade-item IDs; never redefine product identity |
| Shipment, logistic unit, carrier handoff, traceability event history | Logistics domain | Consume product/trade-item and factory references through contracts/events |
| Production lot/batch and production run | Factory domain unless an approved domain decision assigns production traceability elsewhere | Product/Logistics store references; no duplicate source of truth |
| Verification workflow | Owning domain for the verified resource; CORE supplies common trust/audit primitives | Decisions are authorized, auditable, evidence-backed, and scoped |

## Decision

1. AFA CODE is a cross-domain identifier contract and user-facing capability, not a new all-owning business domain.
2. Product domain owns product, variant, trade-item and external-identifier associations.
3. Factory domain owns facility and production records.
4. Logistics domain owns shipment, logistic-unit and traceability-event records.
5. AFX-CORE remains authoritative for organization identity, memberships, security context, permissions, policy and audit primitives.
6. Public AFA IDs are stable references. Existing internal primary keys remain internal; public IDs must not be retrofitted into existing record IDs without a migration and compatibility plan.
7. Cross-domain references are validated through explicit application interfaces, versioned contracts or events. No cross-domain foreign keys or direct table reads are introduced.
8. External-ID syntactic validation and check-digit validation are separate from ownership verification, authenticity, and legal compliance.
9. The first implementation increment is product-domain external identifier association plus validation. Logistics integration follows as a separate increment under the Logistics domain.

## Consequences

- The existing generic domain runtime may be used only where it meets the domain's invariants; normalized AFA CODE relationships require an explicit persistence design and migration.
- No database migration is approved by this ADR alone. Migration strategy must preserve existing UUID primary keys, tenant isolation, auditability, and rollback capability.
- The canonical API https://api.afaghx.com remains the only external API spine.
- AFA CODE cannot claim GTIN/SSCC assignment authority or GS1/EPCIS conformance without the applicable standards process and conformance evidence.

## Acceptance gates

- Architecture owner approves this ADR.
- Product and Factory/Logistics contracts are agreed at their boundaries.
- Public ID profile, uniqueness scopes and lifecycle semantics are finalized.
- API schema validation and automated tests pass.
- Database migration/rollback and tenant-isolation tests pass against a real supported PostgreSQL environment.
- CI evidence is linked to the exact commit SHA.
