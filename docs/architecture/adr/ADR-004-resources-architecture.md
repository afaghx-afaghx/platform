# ADR-004: Resources Architecture

## Status
Proposed

## Context
- AFAGHX has seven architectural layers with a canonical dependency direction.
- The Experience web surface already contains approved Persian and English user-facing strings.
- Locale ownership is currently embedded in Experience assets rather than represented by a canonical repository resource boundary.
- Public API and event contracts remain explicit and versioned; this resource layer must not become a business-logic or contract-authority layer.
- A top-level `resources/` boundary does not currently exist.

## Decision
Establish `resources/` as the canonical repository boundary for shared, versioned, human-facing resource strings that are explicitly derived from existing AFAGHX Experience content.

Phase B establishes Persian (`fa`) and English (`en`) locale catalogs only. The catalogs are source data for future consumers; this phase does not rewrite the Experience runtime or claim runtime wiring.

## Structure
```
resources/
├── README.md
└── locales/
    ├── fa.json
    └── en.json
```

## Consequences
- Locale resources have explicit language codes.
- Resource keys are stable identifiers; values are language-specific strings.
- No business rules, authorization logic, persistence, API endpoints, or secrets belong in `resources/`.
- Strings must be traceable to existing approved Experience content; no invented product, endpoint, or runtime behavior is introduced.
- Changes to resource structure or ownership require an ADR.

## Alternatives Considered
- Keep strings embedded only in Experience assets (rejected: no canonical shared resource boundary).
- Put localization into AFX-CORE (rejected: CORE must remain identity/trust authority and domain-neutral).
- Put localization into a business domain (rejected: localization is shared platform/resource infrastructure, not domain truth).

## Related
- ADR-001 (canonical architecture baseline)
- ADR-003 (route architecture)
- AGENTS.md rule 1 (AFX-CORE authority)
- AGENTS.md rule 7 (Experience never connects directly to DB)
- AGENTS.md rule 8 (public APIs and events are versioned contracts)
- AGENTS.md rule 12 (shared-kernel remains domain-neutral)
