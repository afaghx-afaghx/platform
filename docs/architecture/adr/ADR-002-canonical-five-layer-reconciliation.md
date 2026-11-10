# ADR-002: Reconcile the Canonical Five-Layer Architecture Classification

- **Status:** Proposed — pending independent Architecture Governance review
- **Date:** 2026-11-10
- **Decision owners:** AFAGHX Architecture Governance
- **Supersedes:** None
- **Related:** ADR-001, AFX-MASTER-ARCH-001 v2.0

## Context

The accepted ADR-001 defines the canonical architecture as five peer layers:

`AFX-CORE → AFX-PLATFORM → DOMAIN → INTELLIGENCE → EXPERIENCE`.

The repository's governing documents drifted:
- `README.md` and ADR-001 described five layers.
- `AGENTS.md` described seven layers by promoting Infrastructure and Engineering & Governance to peer layers.
- `AFX-MASTER-ARCH-001 v2.0` listed eleven items as layers, omitted AFX-PLATFORM from that list, and mixed system actors, business capabilities, infrastructure, governance and cross-cutting concerns with architectural layers.

This creates ambiguity in ownership, dependency direction, architecture enforcement and future module placement.

## Decision proposed

Retain ADR-001's accepted five-layer spine without changing its names or order:

1. **AFX-CORE** — identity and trust foundation.
2. **AFX-PLATFORM** — shared platform capabilities and technical services.
3. **BUSINESS DOMAINS** — bounded business capabilities and their authoritative data.
4. **DATA & INTELLIGENCE** — governed data products, analytics, BI and AI.
5. **AFX-EXPERIENCE** — user-facing channels and applications.

Classify the following as orthogonal operating planes or cross-cutting concerns, not additional peer layers:
- stakeholders and participating organizations;
- infrastructure and runtime operations;
- engineering, architecture and governance;
- ecosystem integration and external partner boundaries;
- cross-cutting quality/security concerns;
- data governance and master-data stewardship;
- lifecycle and evolution controls.

These concerns may span multiple layers. They do not create new dependency directions, own duplicate business truth, or supersede the five-layer baseline.

## Consequences

- ADR-001 remains the accepted source for the canonical layer count and ordering.
- `AGENTS.md`, `README.md` and the master architecture specification use consistent terminology.
- Infrastructure and governance remain first-class responsibilities without being misrepresented as business/application layers.
- Architecture checks and future module placement can use one stable five-layer taxonomy.
- No runtime behavior, API contract, database schema, security policy or production deployment is changed by this documentation-only reconciliation.

## Alternatives considered

1. **Adopt seven layers:** rejected because it conflicts with the accepted ADR-001 and creates a second canonical taxonomy.
2. **Adopt eleven layers:** rejected because the list mixes actors, layers, cross-cutting concerns and lifecycle stages, and omits AFX-PLATFORM as a peer layer.
3. **Keep documents inconsistent:** rejected because it leaves architecture interpretation to individual implementers.

## Validation and acceptance plan

Before this ADR becomes Accepted:
1. Independently review the five-layer classification and all affected document changes.
2. Verify exact text consistency across ADR-001, ADR-002, `AGENTS.md`, `README.md` and `AFX-MASTER-ARCH-001-v2.0.md`.
3. Run repository architecture/documentation validation and all applicable CI workflows on the final candidate SHA.
4. Confirm that the change does not alter runtime, API, database or security behavior.
5. Record an independent Architecture Governance decision; the author cannot self-approve.

## Release boundary

This ADR and its associated document edits are a review candidate only. Until independent approval and required CI evidence are recorded, the reconciliation is **PROPOSED / NOT EFFECTIVE**. Do not merge this branch, modify `main`, or claim the architecture governance gate is closed.
