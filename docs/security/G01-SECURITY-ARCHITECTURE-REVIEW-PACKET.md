# AFAGHX G01 Security Architecture Review Packet

**Gate:** G01 — Authentication + Identity + Authorization Security Foundation  
**Review mode:** Evidence-first / fail-closed  
**Status:** READY FOR INDEPENDENT ARCHITECTURE REVIEW — NOT APPROVED

## Review scope

The reviewer must validate the complete authentication trust chain:

`Client -> Transport -> Authentication -> Identity -> Tenant Context -> Membership -> Permission/RBAC -> Policy -> Resource State -> Audit`

## Evidence to inspect

- Gate matrix: `docs/security/AFX-CORE-GATE-01-CLOSURE-MATRIX.md`
- Production evidence contract: `docs/security/G01-PRODUCTION-READINESS-CONTRACT.md`
- Threat model: `docs/security/AFX-CORE-GATE-01-THREAT-MODEL.md`
- Authentication architecture: `docs/security/AFX-CORE-AUTHENTICATION.md`
- HTTP/API boundary: `docs/security/G01-11-HTTP-API-SECURITY-BOUNDARY.md`
- AFX-CORE implementation: `core/AFX-CORE/src/`
- Automated security tests: `core/AFX-CORE/test/`
- GitHub Actions evidence: `.github/workflows/`

## Mandatory review questions

1. Are passwords protected with Argon2id using explicit, calibrated parameters?
2. Are raw access/refresh/recovery credentials absent from durable storage and audit events?
3. Is refresh rotation atomic under concurrency and reuse detection fail-closed?
4. Is tenant isolation enforced before authorization and resource access?
5. Are MFA and WebAuthn lifecycle states durable and revocable in the production data path?
6. Does account recovery preserve MFA and tenant authorization guarantees?
7. Is rate limiting shared across application instances and observable?
8. Are HTTPS, CORS, CSRF, cookie and browser security policies enforced at the actual deployment boundary?
9. Are service identities short-lived and federated, with no shared static service credential?
10. Is KMS/HSM key rotation real, audited and least-privileged?
11. Is security audit storage durable, integrity-protected, access-controlled and retention-enforced?
12. Do dependency, secret, SAST, DAST, container and IaC controls run on PR and protected branch?
13. Has an independent penetration test found no open critical/high findings?
14. Does the release gate remain fail-closed for every unresolved control?

## Required review outcome

The reviewer must record exactly one outcome:

- **APPROVED** — all controls have implementation, test, CI, artifact evidence and production acceptance evidence; no unresolved critical/high finding.
- **APPROVED WITH EXCEPTIONS** — only if exceptions are explicitly documented with owner, mitigation, expiry and risk acceptance authority.
- **REJECTED** — any material security gap, unverifiable evidence or unresolved critical/high finding.

No outcome may be inferred from CI success alone.

## Current known external dependencies

The repository currently cannot self-prove the following without a real deployment/security environment:

- provider-backed KMS/HSM rotation evidence;
- production TLS termination and approved-origin deployment evidence;
- shared distributed rate-limit backend evidence;
- durable production WebAuthn/MFA integration evidence;
- independent external penetration-test report.

These dependencies must be supplied as immutable evidence before Gate 01 can legitimately become GREEN.

## Reviewer sign-off

- Reviewer: ____________________
- Role: ________________________
- Date: ________________________
- Decision: ____________________
- Evidence revision: ____________________
- Exceptions / residual risk: ____________________
