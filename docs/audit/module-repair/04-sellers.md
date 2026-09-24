# 04 — SELLERS MODULE REPAIR MATRIX

**Status: PARTIAL**

Controlled Sellers manifest exists; module-specific executable implementation and proof are not established.

| Area | Status | Required proof |
|---|---|---|
| Architecture | DONE | Registry boundary. |
| Identity / Security | PARTIAL | AFX-CORE authority; enforcement proof required. |
| Tenant / RBAC / Policy | MISSING | Seller role/context/policy tests. |
| UI/UX | MISSING | Executable seller experience. |
| API / Domain / DB | MISSING | Versioned seller contracts and approved boundaries. |
| Events / Audit | MISSING | Event/audit evidence. |
| Validation / Errors | MISSING | Negative-path tests. |
| Observability | MISSING | Telemetry evidence. |
| Tests / CI / Runtime | MISSING | Automated/runtime proof. |
| Production | MISSING | Readiness gate. |

**Repair gate:** implement → test → CI → runtime → evidence.