# AFX-AFA-CODE-IDENTIFIER-CONTRACT-001
## AFA CODE Identifier, Entity Relationship, and Traceability Contract

- **Status:** Proposed; pending review and implementation evidence
- **Version:** 0.1.0
- **Owner:** AFAGHX Architecture / AFA CODE domain
- **Scope:** Identifier semantics, entity boundaries, external identifiers, logistics traceability, lifecycle, access control, and acceptance criteria
- **Change policy:** Any incompatible change requires a new contract version and an Architecture Decision Record (ADR) where repository governance requires it.

## 1. Purpose and normative language

AFA CODE is AFAGHX's internal identity and relationship layer for organizations, facilities, brands, products, trade items, production lots, logistic units, shipments, and traceability events. It does not replace statutory identifiers, GS1 identifiers, customs classifications, certificates, or legal authorization.

The terms **MUST**, **MUST NOT**, **SHOULD**, and **MAY** express requirements for implementations of this proposed contract. This document is a design proposal, not proof that any runtime implementation exists.

## 2. Invariants

1. Every entity has one immutable internal primary key.
2. Human-readable public identifiers are stable references, not authentication credentials or authorization grants.
3. An identifier is never reassigned to another entity, including after archival or revocation.
4. Changes to names, addresses, ownership, country, status, or verification state do not change the entity's internal identity.
5. Entity identity, external identifiers, legal status, verification evidence, commercial offers, market compliance, and logistics events are separate concepts.
6. External identifiers are stored with their identifier scheme and scope; values from different schemes MUST NOT be compared as if they were interchangeable.
7. AFA CODE MUST NOT claim to issue, own, or certify a GS1 GTIN or SSCC.
8. All protected reads and writes MUST enforce server-side authorization and tenant/organization boundaries using the canonical AFX-CORE security context.
9. Domains MUST NOT bypass another domain's persistence boundary. Experience applications MUST NOT connect directly to domain or Core databases.
10. Security-sensitive changes and lifecycle transitions MUST be auditable. Security failures MUST fail closed.
11. Event consumers MUST tolerate duplicate delivery where retries or at-least-once delivery are possible.
12. Public disclosure of entity data MUST be controlled independently from the existence of an identifier.

## 3. Identifier design

### 3.1 Two identifier layers

- **internal_id:** The database/system primary key. UUIDv7 is the recommended candidate, subject to compatibility with the existing repository's storage and ID conventions. UUIDs are identifiers, not secrets.
- **public_id:** A stable, opaque, human-copyable identifier. Its presentation may include a type prefix, but it MUST NOT encode confidential data, tenant names, country, legal status, or sequential business volume.

Recommended display form:

`AFA-{TYPE}-{OPAQUE_TOKEN}`

Examples below are illustrative only and MUST NOT be treated as allocated IDs:

- `AFA-ORG-{token}`
- `AFA-FAC-{token}`
- `AFA-BRD-{token}`
- `AFA-PRD-{token}`
- `AFA-VAR-{token}`
- `AFA-TI-{token}`
- `AFA-LOT-{token}`
- `AFA-UNT-{token}`
- `AFA-LU-{token}`
- `AFA-SHP-{token}`
- `AFA-EVT-{token}`
- `AFA-LOC-{token}`
- `AFA-DOC-{token}`
- `AFA-VER-{token}`

The final token encoding, length, alphabet, checksum (if required), normalization, and case-sensitivity MUST be specified in a versioned implementation-level ID profile before production issuance. The implementation MUST rely on database uniqueness constraints, not probability or application checks alone. On collision, the operation MUST fail safely and retry generation according to a bounded policy.

### 3.2 Entity type semantics

| Type | Entity | Meaning |
|---|---|---|
| ORG | Organization | Legal entity or other registered organization |
| FAC | Facility | Physical/operational production or processing site |
| BRD | Brand | Brand identity, distinct from its current owner |
| PRD | Product | Stable conceptual product identity |
| VAR | Product variant | A materially distinguishable model/configuration |
| TI | Trade item | Defined item intended to be ordered, priced, invoiced, or traded |
| LOT | Lot/batch | Group of items associated with a production batch |
| UNT | Serialized unit | One individually identified physical item, only where needed |
| LU | Logistic unit | A shipping unit such as a carton, case, or pallet |
| SHP | Shipment | A transport/dispatch consignment or shipment record |
| EVT | Event | An immutable traceability or lifecycle event record |
| LOC | Location | A managed physical or operational location |
| DOC | Document record | Metadata and controlled reference to a document/blob |
| VER | Verification case | A review workflow and its evidence/decision history |

A role such as seller, manufacturer, importer, exporter, distributor, or brand owner MUST normally be modeled as a relationship/role assigned to an organization, not as a duplicate organization identity. A facility is not automatically a legal entity.

### 3.3 Lifecycle and deletion

Identifiers MUST NOT be reused. Records may be active, suspended, revoked, archived, or soft-deleted according to entity-specific lifecycle rules. Revocation of a verification decision or external-identifier association MUST NOT erase historical references. Physical deletion is restricted by legal retention, privacy, and data-governance requirements; retention rules must be defined before implementation.

## 4. Entity relationships

The logical model MUST support:

- One organization to many facilities.
- Many-to-many organization/facility relationships where ownership, operation, contract manufacturing, or authorization differs.
- One brand to many products, with time-bounded ownership/licensing relationships.
- One product to many variants; one variant to one or more trade items where packaging/market configuration warrants it.
- One product/trade item to multiple external identifiers only where each scheme's rules permit it.
- One trade item/product to multiple production facilities and lots, with production relationships and effective dates recorded.
- One organization to multiple commercial roles and offers; offers are not product identity.
- One product/trade item to multiple market profiles, each scoped by market/jurisdiction and validity period.
- One shipment to multiple logistic units; logistic units may contain other logistic units where explicitly modeled.
- Traceability events to the relevant objects, locations, parties, and source evidence.

Required logical tables/aggregates (names are proposals and must follow repository conventions): `organizations`, `organization_roles`, `facilities`, `organization_relationships`, `brands`, `products`, `product_variants`, `trade_items`, `external_identifiers`, `product_market_profiles`, `lots`, `serialized_units` (optional by product policy), `logistic_units`, `shipments`, `tracking_events`, `documents`, `verification_cases`, and `audit_events`.

Cross-domain relationships MUST use stable identifiers and explicit contracts; one domain MUST NOT directly read or mutate another domain's private tables.

## 5. External identifier registry

Each external identifier association SHOULD contain:

- `entity_type` and `entity_id`
- `scheme` (for example GTIN, SSCC, legal registration number, tax identifier, or another formally defined scheme)
- `value_normalized` and, where needed, `value_display`
- `issuing_authority` (nullable only when not applicable)
- `jurisdiction_or_scope` (nullable only when not applicable)
- `valid_from`, `valid_until` (when the scheme supports validity periods)
- `verification_status`, `verified_at`, `verification_method`
- `evidence_document_id` and audit metadata where applicable

Uniqueness MUST be enforced by a scheme-specific rule, not by assuming every identifier value is globally unique across all schemes. Where appropriate, the uniqueness key is `(scheme, normalized value, scope)`; the exact rule MUST be defined per scheme. Conflicting or reassigned values MUST enter a review/conflict workflow rather than being silently attached to a second entity.

### 5.1 GTIN

GTIN is an external GS1 trade-item identifier. AFA CODE MUST store it as an external identifier and MUST NOT imply that AFAGHX assigned or licensed it. Validation MUST distinguish format/check-digit validation from allocation/ownership verification and product association. A valid check digit alone does not prove authenticity, ownership, or regulatory compliance. GTIN assignment and reuse rules must follow the applicable GS1 rules.

### 5.2 SSCC and logistics identifiers

SSCC identifies a logistic unit in GS1 systems and MUST NOT be treated as interchangeable with GTIN, AFA product ID, or shipment ID. When a partner supplies an SSCC, preserve it under the SSCC scheme. AFA may also assign an internal LU public ID; the two identifiers must be related, not overwritten or conflated.

### 5.3 HS classification and legal identifiers

HS codes are classification data, not product identity. Classification may depend on product characteristics, jurisdiction, and applicable tariff nomenclature. Store code, nomenclature/version, jurisdiction, source, and review status where needed. Company registration and tax IDs must be scoped by issuing authority/jurisdiction and kept separate.

## 6. Market profiles and compliance

A product-market profile is a time-bounded assessment of a trade item/product for a specific destination market. It MAY include applicable HS classification, labeling requirements, importer/responsible-party data, certificates, declarations, restrictions, and compliance status.

A market profile MUST NOT be interpreted as legal approval solely because a record exists. Every compliance assertion needs its source, jurisdiction, status, validity period, and review provenance. Expired or revoked evidence must not continue to appear as currently valid.

## 7. Traceability event contract

Each traceability event MUST support, where applicable:

- `event_id` and event schema/version
- event type and business step
- event time (`event_time`) and system recording time (`recorded_at`), stored consistently in UTC
- referenced products/trade items, lots/serials, logistic units, shipments, parties, and locations
- source system, responsible actor, organization context, and correlation/idempotency metadata
- evidence references and verification status
- correction/reversal relationship to a prior event when applicable

Events MUST preserve historical truth. Corrections SHOULD be represented by linked corrective/voiding events or a versioned, auditable correction mechanism; silent mutation or deletion is prohibited. The model SHOULD map to GS1 EPCIS 2.0 concepts (what, when, where, why, and relevant disposition/condition) for interoperability, without claiming EPCIS conformance until mapping and conformance tests exist.

A scan or carrier status alone does not prove product authenticity, legal compliance, or final handover. Claims of delivery require a defined evidence/confirmation policy.

## 8. Lifecycle and verification state machines

Entity lifecycle and verification lifecycle are separate.

Suggested verification states:

`draft → submitted → under_review → approved | rejected | needs_information`

Additional transitions may include resubmission after `needs_information`, appeal/reopen with reason, and revocation/suspension of a previously approved decision. Every transition MUST check actor permission, allowed prior state, required evidence, and reason codes. Approval/rejection decisions MUST include reviewer identity, timestamp, decision rationale, and evidence references. A submitter MUST NOT approve their own record unless a formally approved policy explicitly permits it; default policy is separation of duties.

The exact state graph and transition permissions must be machine-readable and covered by tests before production.

## 9. Access control and privacy

- AFX-CORE remains the sole authority for identity, authentication, tenant context, membership, RBAC/permissions, policy, audit, and trust primitives.
- Every protected request MUST resolve the immutable security context before resource access.
- Client-supplied tenant/organization IDs are selectors only and MUST be validated against trusted membership and policy; they are never proof of authorization.
- Sellers can create and manage records they own or are authorized to manage, but cannot grant themselves verification approval.
- Reviewers can access only cases within their delegated scope. Privileged actions require audit records.
- Public product data, business-confidential data, personal data, and restricted documents require separate visibility policies.
- File downloads require authorization at access time; obscurity of a URL is not access control.
- Logs MUST avoid secrets and unnecessary sensitive data.
- Security failures MUST fail closed.

## 10. API contract requirements

Before implementation, publish a versioned OpenAPI contract for the actual repository API conventions. Minimum logical operations:

- create/update a draft organization, facility, product, variant, or trade item
- submit a verification case and request additional information
- approve/reject/revoke within authorized reviewer scope
- register and verify an external identifier
- query public or authorized identifier records
- create shipment/logistic-unit relationships
- append traceability events and query an object's event history

Every write endpoint MUST define authentication/authorization requirements, validation errors, idempotency behavior where relevant, audit behavior, pagination, and conflict responses. Public endpoints MUST return only explicitly public fields. Do not introduce a second API spine; use the canonical AFAGHX API/gateway conventions after repository discovery.

## 11. Acceptance tests and release gates

The contract is not implementation-complete until automated tests and CI evidence cover:

1. Database-enforced uniqueness under concurrent identifier creation.
2. Collision/error behavior and no identifier reassignment after revocation/archive.
3. Stable IDs after changes to names, addresses, ownership, country, or status.
4. Scheme-specific external-ID normalization and uniqueness.
5. GTIN format/check-digit validation separated from ownership verification.
6. SSCC, GTIN, AFA product ID, and shipment ID are not conflated.
7. One product linked to multiple facilities, sellers, lots, and market profiles.
8. Unauthorized cross-organization reads/writes are denied.
9. Submitter cannot self-approve by default.
10. Expired/revoked documents do not appear currently valid.
11. Duplicate event delivery is idempotently handled where applicable.
12. Traceability corrections preserve the original audit trail.
13. Public APIs redact private documents and confidential fields.
14. API schema and database migration tests pass.
15. Contract mapping tests exist for the supported EPCIS/GS1 exchange profile.

Release decision MUST be evidence-based. A failed critical security test, missing required migration test, or unresolved contract conflict blocks approval regardless of aggregate score.

## 12. Implementation checklist

- [ ] Confirm existing repository language, framework, database, API style, ID conventions, and test commands.
- [ ] Record an ADR for any required structural/domain-boundary decision.
- [ ] Finalize the public ID token profile and scheme-specific uniqueness rules.
- [ ] Finalize the state machine and role/permission matrix.
- [ ] Publish versioned OpenAPI and event schemas.
- [ ] Implement migrations, constraints, services, and authorization at the existing architectural boundary.
- [ ] Add unit, integration, contract, security, and migration tests.
- [ ] Run repository CI and retain commit-SHA-linked evidence.
- [ ] Review the resulting PR; do not merge or publish until all required gates pass.

## 13. Status and honest scoring

This file specifies a proposed contract only. It does not claim that APIs, database migrations, UI, GS1 conformance, or runtime tests have been implemented. The architecture can be reviewed now, but implementation approval requires evidence tied to a commit SHA and CI run. No score of 9.8/10 or higher should be reported until the weighted review rubric is met and all critical gates pass.
