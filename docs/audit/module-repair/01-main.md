# 01 — MAIN MODULE REPAIR MATRIX

**Status: PARTIAL**

| Area | Status | Finding / required evidence |
|---|---|---|
| Architecture / Constitution | DONE | Registry and Experience boundary defined. |
| Identity / Authentication | PARTIAL | UI exists; executable auth path conflicts with server routing and needs E2E proof. |
| Tenant Context | PARTIAL | Referenced by dashboard, not proven end-to-end. |
| RBAC / Permission | PARTIAL | Authority is AFX-CORE; module-specific enforcement not proven. |
| Policy | PARTIAL | Canonical authority declared; runtime proof missing. |
| UI/UX | PARTIAL | Real Main shell exists; full route coverage not proven. |
| API | MISSING | server rejects /api/*; canonical API integration must be proven. |
| Domain | MISSING | Main-specific business flows not proven. |
| Database | MISSING | No direct Experience DB allowed; approved persistence path not proven here. |
| Events | MISSING | No module-specific event proof. |
| Audit | MISSING | No module-specific audit evidence. |
| Security | PARTIAL | Security headers and boundary are present; E2E proof incomplete. |
| Validation | PARTIAL | Login UI validates fields; backend path not proven. |
| Error Handling | PARTIAL | 404/500 handling exists; auth failure path not proven. |
| Observability | MISSING | No module-specific observability evidence. |
| Tests | MISSING | Referenced test command has no verified test file in audited path. |
| CI/CD | PARTIAL | Global gates exist; Main-specific execution gate not proven. |
| Runtime | PARTIAL | Shell runtime exists; auth execution path is inconsistent. |
| Evidence | PARTIAL | Registry evidence exists; runtime evidence incomplete. |
| Production | MISSING | Production readiness is not established. |

**P0 repair:** reconcile canonical API/auth routing, add executable E2E proof, then continue domain/module implementation.