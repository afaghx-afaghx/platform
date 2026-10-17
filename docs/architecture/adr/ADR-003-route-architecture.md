# ADR-003: Route Architecture

## Status
Proposed

## Context
- AFAGHX has 7 layers with canonical dependency direction.
- Experience must never connect directly to databases.
- Public APIs and events must be explicit, versioned contracts.
- Route ownership must be explicit per layer.
- Currently, `routes/` does not exist; route boundaries are implicit.

## Decision
Establish `routes/` as the canonical top-level boundary for:
- API route ownership
- Experience route ownership
- Internal service route ownership
- Canonical request flow enforcement

## Structure
```
routes/
├── README.md
├── api.md
├── experience.md
├── internal.md
├── ownership.json
└── scripts/
    ├── validate.sh
    └── README.md
```

## Consequences
- All routes must declare an owner layer.
- No route may bypass canonical dependency direction.
- Experience routes must not connect to databases.
- API routes must resolve security context before resource access.
- Route ownership changes require ADR update.

## Alternatives Considered
- Implicit routing (rejected: no ownership clarity)
- Per-layer routing (rejected: fragmentation)
- External API gateway only (rejected: internal routing still needed)

## Related
- AGENTS.md rule 4 (security context resolution)
- AGENTS.md rule 5 (tenant isolation at API boundary)
- AGENTS.md rule 7 (Experience never connects directly to DB)
- AGENTS.md rule 8 (public APIs are versioned contracts)
- ADR-001 (canonical architecture baseline)
