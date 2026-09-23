# 14 — FACTORIES MODULE REPAIR MATRIX

**Status: PARTIAL**

Controlled Factories manifest exists; module-specific executable implementation and proof are not established.

| Area | Status | Required proof |
|---|---|---|
| Architecture | DONE | Registry boundary. |
| Identity / Security | PARTIAL | AFX-CORE authority; enforcement proof required. |
| Tenant / RBAC / Policy | MISSING | Factory context/policy tests. |
| UI/UX | MISSING | Executable factory experience. |
| API / Domain / DB | MISSING | Factory/capacity contracts and approved boundaries. |
| Events / Audit | MISSING | Factory event/audit evidence. |
| Validation / Errors | MISSING | Negative-path tests. |
| Observability | MISSING | Telemetry evidence. |
| Tests / CI / Runtime | MISSING | Automated/runtime proof. |
| Production | MISSING | Readiness gate. |

**Repair gate:** implement → test → CI → runtime → evidence.