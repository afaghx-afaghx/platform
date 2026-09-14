# AFX-MASTER-ARCH-001 V2.0 — Compliance Matrix

**Status:** RED / ACTIVE AUDIT
**Parent:** #55
**Branch:** `architecture/v2-master-closure`

| ID | Control | Current evidence | Status | Required closure |
|---|---|---|---|---|
| V2-01 | Master architecture V2 source exists | `docs/architecture/AFX-MASTER-ARCH-001-V2.md` | IN PROGRESS | Human approval and merge to `main` |
| V2-02 | All architecture artifacts reference same master | V2 lock/system/module maps and README aligned; full repository reconciliation pending | IN PROGRESS | Complete reference scan and merge |
| V2-03 | Single AFX-CORE security authority | Public Core entrypoint now exports PersistentAfxCore/repository; Experience no longer instantiates Core | IN PROGRESS | Fresh CI reachability proof |
| V2-04 | Canonical runtime wiring | `platform/API/server.js` wires `Gateway Security Boundary → PersistentAfxCore → PostgresAfxCoreRepository → PostgreSQL` | IN PROGRESS | Fresh end-to-end CI evidence |
| V2-05 | In-memory Core not production reachable | Experience path removed; public Core entrypoint excludes in-memory implementation; machine grep gate added | IN PROGRESS | Fresh CI gate PASS |
| V2-06 | Persistence schema/repository | PostgreSQL repository + migrations + CI PostgreSQL service | IN PROGRESS | Fresh persistence CI PASS |
| V2-07 | Restart/multi-instance persistence | CI now starts two API instances against same PostgreSQL and checks session after restart | IN PROGRESS | Fresh CI PASS |
| V2-08 | Refresh rotation/reuse prevention | Transactional repository + CI replay test | IN PROGRESS | Fresh CI PASS |
| V2-09 | Domain ownership | `.ai/architecture/ownership-map.yaml` + G05.1 work | IN PROGRESS | Machine gate GREEN and architecture review |
| V2-10 | Cross-domain DB prohibition | Dependency rules documented | IN PROGRESS | Source scan + tests |
| V2-11 | API/event versioning | Versioned `/v1` canonical API runtime added | IN PROGRESS | Contract inventory + drift gate |
| V2-12 | Experience/API boundary | Experience proxies `/api/*` to canonical `AFAGHX_API_ORIGIN`; no Core dependency | IN PROGRESS | Fresh browser/API CI evidence |
| V2-13 | Infrastructure baseline | `infrastructure/docker-compose.yml` + `api.Dockerfile` provide executable PostgreSQL/API baseline | IN PROGRESS | Build/runtime evidence in CI |
| V2-14 | CI architecture/security gates | `canonical-runtime-gate.yml` adds persistence, 200/401/403, restart, refresh replay and forbidden-Core gates | IN PROGRESS | Fresh workflow PASS and required-check policy |
| V2-15 | AI boundary/evidence | AI control-plane artifacts exist | IN PROGRESS | Machine enforcement + evidence provenance |
| V2-16 | No artificial GREEN | Governance docs explicitly require evidence | IN PROGRESS | Final gate must block UNKNOWN/RED |
| V2-17 | Four-team ownership | Governance model exists | IN PROGRESS | Map every closure item to one team |
| V2-18 | Production security G01 closure | G01 remains open/red in current governance | BLOCKED | Close controls with real evidence |

## Current blockers

1. V2 is not yet merged and human-approved on `main`.
2. Fresh CI/runtime evidence for the new canonical path has not yet been verified as GREEN.
3. Full repository-wide architecture/reference reconciliation is still pending.
4. Domain/entity ownership and cross-context DB scans remain pending closure evidence.
5. G01 security closure remains open until all controls have real evidence.

**Rule:** No item may be changed from BLOCKED/IN PROGRESS to GREEN by documentation-only edits.
