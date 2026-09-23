# 01 — MAIN MODULE REPAIR MATRIX

**Status: PARTIAL**

| Area | Status | Finding / required evidence |
|---|---|---|
| Architecture / Constitution | DONE | Registry and Experience boundary defined; Experience remains a presentation client and does not own authentication. |
| Identity / Authentication | PARTIAL | Canonical Gateway auth runtime now establishes Secure/HttpOnly access and refresh cookies and accepts them for context/refresh/logout; live deployed E2E proof is still required. |
| Tenant Context | PARTIAL | AFX-CORE binds sessions to tenant membership; browser login still requires an explicit tenant context and end-to-end tenant proof is pending. |
| RBAC / Permission | PARTIAL | Authority is AFX-CORE; canonical authorization exists, but Main-specific protected-resource proof is pending. |
| Policy | PARTIAL | Canonical authority declared; full policy/resource-state runtime proof is pending. |
| UI/UX | PARTIAL | Real Main shell exists; full route coverage and protected navigation are not yet proven. |
| API | PARTIAL | Experience correctly rejects local `/api/*`; canonical `/v1/auth/*` endpoints are implemented in Platform Gateway. Browser client targets `https://api.afaghx.com` with credentialed requests. Live deployment/CORS proof remains pending. |
| Domain | MISSING | Main-specific business flows not proven. |
| Database | PARTIAL | Experience has no direct DB access; canonical PersistentAfxCore → PostgreSQL path exists, but Main browser-to-database runtime proof is pending. |
| Events | MISSING | No Main-specific event proof. |
| Audit | PARTIAL | AFX-CORE authentication audit events exist; Main-specific audit evidence is not yet demonstrated end-to-end. |
| Security | PARTIAL | Security headers, CORS boundary, rate limiting and HttpOnly cookie transport are present; production-origin and live E2E proof remain pending. |
| Validation | PARTIAL | Login UI validates fields and Gateway/Core validate credentials/tenant membership; browser tenant-selection behavior is not yet proven. |
| Error Handling | PARTIAL | Canonical 401/403/404/429 paths exist; browser-facing end-to-end failure proof is pending. |
| Observability | PARTIAL | Canonical request IDs are emitted by Gateway; full logs/metrics/traces evidence is not yet proven. |
| Tests | PARTIAL | Existing Experience auth-boundary test plus new canonical Gateway cookie-flow test provide executable contract coverage; CI execution is still required. |
| CI/CD | PARTIAL | Global gates exist; this repair branch's required checks have not yet been observed GREEN. |
| Runtime | PARTIAL | Canonical runtime path exists and browser-session contract is implemented; live deployment proof is pending. |
| Evidence | PARTIAL | Code and executable tests now document the boundary; live CI/runtime evidence is still required. |
| Production | MISSING | Production readiness is not established. |

**P0 repair completed at code-contract level:** the documentation/client/server contradiction was removed without creating a local authentication authority. The Experience shell remains `canonical_api_only`; authentication is owned by the canonical Gateway → PersistentAfxCore → PostgreSQL path. Remaining P0 evidence is CI execution, explicit production CORS origin configuration, live API execution, and tenant-aware browser E2E proof.
