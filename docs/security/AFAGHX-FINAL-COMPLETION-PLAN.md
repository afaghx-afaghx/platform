# AFAGHX Final Completion Plan

**Repository:** `afaghx-afaghx/platform`
**Canonical branch:** `main`
**Architecture baseline:** LOCKED
**Current release decision:** NOT READY FOR PRODUCTION

## 1. Final definition of done

AFAGHX is not considered complete because folders, interfaces, or documentation exist. Production completion requires all of the following to be true:

`Implementation + Automated Tests + CI Enforcement + Security Evidence + Operational Evidence + Architecture Review = RELEASE READY`

A control is **DONE** only when its acceptance criterion is objectively demonstrated. Documentation alone never closes a security control.

## 2. Mandatory completion order

### Gate A — AFX-CORE trust foundation

1. Durable PostgreSQL identity, membership, session and refresh-token persistence.
2. Transactional refresh rotation with race/reuse protection.
3. HTTP/API authentication boundary.
4. Authorization context propagation: identity → tenant → membership → RBAC → policy → resource state.
5. Production password-hashing decision and calibrated parameters.
6. MFA enrollment/challenge/recovery/revocation.
7. Secure account recovery and step-up authentication.
8. Browser-level WebAuthn/passkey registration and authentication.
9. Login/refresh abuse controls and rate limiting.
10. CSRF, secure-cookie, security-header and strict-CORS enforcement.
11. Durable audit trail, redaction and retention controls.

### Gate B — Platform security boundary

12. API Gateway with authentication, authorization, request policy, rate limiting, CORS and security headers.
13. Service-to-service workload identity using short-lived credentials.
14. KMS/HSM abstraction with production provider integration and rotation evidence.
15. Secrets management with zero production secrets in source control.
16. Centralized observability: logs, metrics, traces and security events.
17. Security scanning: dependency, secret, SAST, DAST, container and IaC checks.

### Gate C — Data and contract foundation

18. Explicit database ownership for every bounded context.
19. Versioned API/event contracts.
20. Migration/seeding strategy with repeatable CI validation.
21. Tenant isolation tests across persistence and service boundaries.
22. Shared-kernel restrictions enforced; no domain logic in shared infrastructure packages.

### Gate D — Domain implementation

23. Implement domains only after Gate 01 is GREEN.
24. Each domain owns its business rules and persistence boundary.
25. Cross-domain communication occurs only through approved contracts/events/application interfaces.
26. Domain authorization always consumes AFX-CORE security context; no competing identity/token/session authority is allowed.

### Gate E — Intelligence and experience

27. Governed data platform and analytics.
28. AI/recommendation/forecasting/risk capabilities behind authorization and tenant controls.
29. Web, mobile, admin and partner experiences through approved API/Gateway boundaries.
30. No client application receives direct database access or private security credentials.

### Gate F — Production operations

31. Docker/Kubernetes/Terraform deployment definitions.
32. WAF/CDN/network controls.
33. Backup and disaster recovery with restore evidence.
34. Monitoring, alerting, tracing and incident runbooks.
35. Staging environment validation.
36. Production readiness review.
37. Independent penetration test with no open critical/high findings.
38. Protected-branch release gate requiring all mandatory controls to be GREEN.

## 3. Explicit blockers

The following cannot be honestly closed by repository code alone:

- **Real KMS/HSM rotation:** requires an approved cloud/on-prem KMS/HSM environment, workload identity and IAM permissions.
- **Independent penetration test:** requires an isolated test environment and qualified external assessor.
- **Production release:** requires staging evidence, operational readiness, backup/restore evidence and final architecture/security approval.

CI may use deterministic test providers/mocks for engineering validation, but those tests must never be represented as proof of production KMS or external penetration-test completion.

## 4. Required evidence per control

Every mandatory control must retain:

- implementation path and commit SHA;
- deterministic automated test result;
- GitHub Actions job/result;
- machine-readable or reviewable evidence artifact;
- owner and review decision;
- explicit residual-risk statement when applicable.

## 5. Release gates

### G01 — Identity/Auth/Security

No domain implementation is approved while G01 is RED. All G01 controls must be DONE and the external/environmental blockers resolved before production release.

### G02 — Platform/Data

API/Gateway, workload identity, KMS, secrets, observability, scanning, database ownership and contract governance must be GREEN.

### G03 — Product domains

Every production domain must have code, tests, contracts, authorization coverage, persistence ownership and operational documentation.

### G04 — Production

Staging, security, resilience, backup/restore, observability and independent assessment evidence must be GREEN.

## 6. Non-negotiable architectural invariants

- AFX-CORE is the authoritative trust foundation.
- No domain creates a competing authentication, identity, session or token authority.
- Authorization is deny-by-default.
- Tenant context is mandatory wherever tenant-scoped resources exist.
- Experience layers are untrusted clients.
- Experience → API/Gateway → Application → Domain → Persistence.
- Domains do not directly access another domain's tables.
- Production secrets and private keys are never committed to source control.
- KMS/key rotation must be evidenced, not asserted.
- AI and analytics cannot bypass transactional authorization or mutate domain state outside approved application boundaries.
- A green unit test is never sufficient evidence for a production security claim.

## 7. Current decision

The repository has a locked five-layer architecture, explicit layer-boundary documentation, and a working AFX-CORE security baseline. Persistent authentication/session behavior has additional database and concurrency coverage, and the persistent test suite has been corrected to use asynchronous rejection assertions and deterministic pool cleanup.

However, the project remains **RED / NOT RELEASE READY** until the mandatory controls in `docs/security/AFX-CORE-GATE-01-CLOSURE-MATRIX.md` are closed with real evidence. In particular, browser-level WebAuthn, MFA/recovery, HTTP security boundary, KMS rotation evidence, workload identity, security scanning, threat-model review and independent penetration testing remain release conditions.

## 8. Completion principle

The objective is not to make the status page GREEN. The objective is to make every GREEN status defensible from code, tests, CI and evidence.
