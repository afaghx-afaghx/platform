# AFX-MASTER-ARCH-001 V2.0 — Compliance Matrix

**Status:** RED / ACTIVE AUDIT
**Parent:** #55
**Branch:** `architecture/v2-master-closure`

| ID | Control | Current evidence | Status | Required closure |
|---|---|---|---|---|
| V2-01 | Master architecture V2 source exists | `docs/architecture/AFX-MASTER-ARCH-001-V2.md` | IN PROGRESS | Approve/merge V2 and reconcile all references |
| V2-02 | All architecture artifacts reference same master | v1 lock/system-map still reference v1 | BLOCKED | Update and validate all source-of-truth references |
| V2-03 | Single AFX-CORE security authority | Core specs + runtime implementations exist | IN PROGRESS | Prove no production alternate authority |
| V2-04 | Canonical runtime wiring | Persistent Core exists; full production wiring not yet proven | BLOCKED | End-to-end runtime evidence |
| V2-05 | In-memory Core not production reachable | `core/AFX-CORE/src/core.js` exists | BLOCKED | Import/reachability audit + production-path test |
| V2-06 | Persistence schema/repository | PostgreSQL repository and migrations exist | IN PROGRESS | Full CI/runtime persistence evidence |
| V2-07 | Restart/multi-instance persistence | Dedicated tests/PR history exist | IN PROGRESS | Fresh successful CI evidence on final head |
| V2-08 | Refresh rotation/reuse prevention | Transactional repository implementation exists | IN PROGRESS | Fresh concurrency/reuse evidence on final head |
| V2-09 | Domain ownership | `.ai/architecture/ownership-map.yaml` + G05.1 work | IN PROGRESS | Machine gate GREEN and architecture review |
| V2-10 | Cross-domain DB prohibition | Dependency rules documented | IN PROGRESS | Source scan + tests |
| V2-11 | API/event versioning | Platform event foundation exists | IN PROGRESS | Contract inventory + drift gate |
| V2-12 | Experience/API boundary | Experience prototype and API client boundary exist | IN PROGRESS | Browser/API boundary evidence |
| V2-13 | Infrastructure baseline | `infrastructure/` currently contains only README | BLOCKED | Executable runtime/deployment/ops baseline |
| V2-14 | CI architecture/security gates | Multiple workflows exist | IN PROGRESS | Consolidated required-check policy + fresh runs |
| V2-15 | AI boundary/evidence | AI control-plane artifacts exist | IN PROGRESS | Machine enforcement + evidence provenance |
| V2-16 | No artificial GREEN | Governance docs explicitly require evidence | IN PROGRESS | Final gate must block UNKNOWN/RED |
| V2-17 | Four-team ownership | Governance model exists | IN PROGRESS | Map every closure item to one team |
| V2-18 | Production security G01 closure | G01 remains open/red in current governance | BLOCKED | Close controls with real evidence |

## Current blockers

1. V2 is not yet the merged repository-wide source of truth.
2. Canonical production runtime wiring is not yet proven end-to-end.
3. In-memory `AfxCore` reachability has not yet been conclusively eliminated from production paths.
4. Infrastructure directory lacks an executable production/runtime baseline.
5. G01 security closure remains open until all controls have real evidence.

**Rule:** No item may be changed from BLOCKED/IN PROGRESS to GREEN by documentation-only edits.
