# ADR-0004 — Foundation Gates and Merge Discipline

## Status
Accepted

## Context
AFAGHX now contains multiple architecture and implementation branches. The ecosystem requires a deterministic path from trust foundation to platform, data, domain and experience layers without allowing large mixed-purpose changes or premature product implementation to weaken the architecture.

## Decision
AFAGHX will use six implementation gates:

1. Trust Foundation
2. Platform Foundation
3. Data Foundation
4. Domain Foundation
5. Intelligence & Experience
6. Production Readiness

`main` remains the canonical integration baseline. Architecture precedes dependent implementation. Foundation work is delivered as small vertical slices with automated evidence. Experimental branches are not treated as canonical architecture lines.

A PR is merge-ready only when its scope is internally coherent, architectural invariants remain true, required automated checks pass, and the change does not silently bypass an earlier gate.

## Consequences
- Prevents premature microservice/domain expansion.
- Makes security and tenant isolation release criteria rather than documentation promises.
- Keeps the Git history reviewable.
- Requires deliberate cleanup of obsolete experimental branches and duplicate PR paths.
- Allows future service extraction without changing the trust model.

## Rejected alternative
Merge the largest available foundation branch directly into `main` and repair boundaries later. This was rejected because it increases architectural coupling and makes validation, rollback and review harder.
