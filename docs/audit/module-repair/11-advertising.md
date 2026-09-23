# 11 — ADVERTISING MODULE REPAIR MATRIX

**Status: PARTIAL**

Controlled Advertising manifest exists; module-specific executable implementation and proof are not established.

| Area | Status | Required proof |
|---|---|---|
| Architecture | DONE | Registry boundary. |
| Identity / Security | PARTIAL | AFX-CORE authority; enforcement proof required. |
| Tenant / RBAC / Policy | MISSING | Advertising authorization/policy tests. |
| UI/UX | MISSING | Executable advertising experience. |
| API / Domain / DB | MISSING | Advertising contracts and approved boundaries. |
| Events / Audit | MISSING | Campaign event/audit evidence. |
| Validation / Errors | MISSING | Negative-path tests. |
| Observability | MISSING | Telemetry evidence. |
| Tests / CI / Runtime | MISSING | Automated/runtime proof. |
| Production | MISSING | Readiness gate. |

**Repair gate:** implement → test → CI → runtime → evidence.