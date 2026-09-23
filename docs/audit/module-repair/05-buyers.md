# 05 — BUYERS MODULE REPAIR MATRIX

**Status: PARTIAL**

Controlled Buyers manifest exists; module-specific executable implementation and proof are not established.

| Area | Status | Required proof |
|---|---|---|
| Architecture | DONE | Registry boundary. |
| Identity / Security | PARTIAL | AFX-CORE authority; enforcement proof required. |
| Tenant / RBAC / Policy | MISSING | Buyer context/policy tests. |
| UI/UX | MISSING | Executable buyer experience. |
| API / Domain / DB | MISSING | Versioned buyer contracts and approved boundaries. |
| Events / Audit | MISSING | Event/audit evidence. |
| Validation / Errors | MISSING | Negative-path tests. |
| Observability | MISSING | Telemetry evidence. |
| Tests / CI / Runtime | MISSING | Automated/runtime proof. |
| Production | MISSING | Readiness gate. |

**Repair gate:** implement → test → CI → runtime → evidence.