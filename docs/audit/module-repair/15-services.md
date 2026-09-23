# 15 — SERVICES MODULE REPAIR MATRIX

**Status: PARTIAL**

Controlled Services manifest exists; module-specific executable implementation and proof are not established.

| Area | Status | Required proof |
|---|---|---|
| Architecture | DONE | Registry boundary. |
| Identity / Security | PARTIAL | AFX-CORE authority; enforcement proof required. |
| Tenant / RBAC / Policy | MISSING | Service-provider context/policy tests. |
| UI/UX | MISSING | Executable service experience. |
| API / Domain / DB | MISSING | Service contracts and approved boundaries. |
| Events / Audit | MISSING | Service event/audit evidence. |
| Validation / Errors | MISSING | Negative-path tests. |
| Observability | MISSING | Telemetry evidence. |
| Tests / CI / Runtime | MISSING | Automated/runtime proof. |
| Production | MISSING | Readiness gate. |

**Repair gate:** implement → test → CI → runtime → evidence.