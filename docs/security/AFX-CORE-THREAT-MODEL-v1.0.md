# AFX-CORE Threat Model v1.0

**System:** AFAGHX AFX-CORE
**Scope:** Identity, authentication, authorization, session/refresh lifecycle, API boundary, PostgreSQL persistence, audit, browser/Experience boundary and production release controls.
**Architecture baseline:** `AFX-MASTER-ARCH-001 v2.0`
**Canonical runtime:** `Gateway -> PersistentAfxCore -> AfxCoreRepository -> PostgreSQL`
**Date:** 2026-09-17

## 1. Security objectives

- Preserve confidentiality of credentials, session material, tenant data and audit information.
- Preserve integrity of authentication, membership, authorization and session state.
- Prevent cross-tenant access.
- Prevent refresh-token replay and concurrent-token duplication.
- Keep Experience code outside the authentication authority boundary.
- Keep production authentication persistent and shared across instances.
- Keep sensitive security operations auditable without storing raw secrets.
- Prevent deployment of code that violates the architecture constitution.

## 2. Assets

| Asset | Owner | Sensitivity | Primary control |
|---|---|---|---|
| User identity records | AFX-CORE Identity | High | PostgreSQL + authorization |
| Password hashes | AFX-CORE Security | Critical | salted one-way hashing |
| Access-token digests | AFX-CORE Session | Critical | digest-only persistence |
| Refresh-token digests/families | AFX-CORE Session | Critical | rotation + reuse detection + transaction locks |
| Membership/role state | AFX-CORE Authorization | Critical | tenant isolation + deny-by-default |
| Audit events | AFX-CORE Audit | High | durable persistence + RBAC + retention |
| API authorization context | AFX-CORE API | Critical | canonical gateway boundary |

## 3. Trust boundaries

### TB-01 Browser / Experience -> Canonical API

The browser is an untrusted client. The Experience server is a presentation shell and must not own authentication state.

**Controls:** canonical API, no local AfxCore, no frontend-to-database path, 401/403 tests, CORS/origin controls.

### TB-02 Gateway -> AFX-CORE

Gateway transport code is allowed to route and enforce edge policy but must not implement domain authorization logic.

**Controls:** canonical runtime enforcement, PersistentAfxCore wiring, architecture fitness tests.

### TB-03 AFX-CORE -> PostgreSQL

Application state is persisted through the repository boundary.

**Controls:** repository-only DB access, migrations, advisory lock for schema initialization, restart-persistence tests.

### TB-04 Service instance -> shared database

A second process must observe the same security state.

**Controls:** persistent sessions, transaction-level refresh locking, no in-memory production fallback.

## 4. Threat catalogue

| ID | Threat | Impact | Likelihood | Required mitigation | Evidence |
|---|---|---:|---:|---|---|
| T01 | Credential stuffing | High | High | rate limiting, abuse telemetry, future risk controls | G01-17 |
| T02 | Credential enumeration | High | Medium | uniform public login errors | G01-02 + security tests |
| T03 | Access-token theft | Critical | Medium | short TTL, digest-only storage, revocation | G01-03/04/07 |
| T04 | Refresh-token replay | Critical | Medium | rotation, family revocation, reuse detection | G01-05/06/12 |
| T05 | Concurrent refresh race | Critical | Medium | row/family locks + transaction | G01-12 |
| T06 | Cross-tenant authorization | Critical | Medium | context tenant binding + deny-by-default | G01-08/11 |
| T07 | Browser CSRF/origin abuse | High | Medium | origin enforcement + browser credential policy | G01-18 |
| T08 | Origin/CORS abuse | High | Medium | explicit allowlist | G01-19 |
| T09 | Experience-side authentication bypass | Critical | Low | presentation-only shell + architecture gate | G01-11 / runtime gate |
| T10 | In-memory production auth state | Critical | Medium | persistent runtime only + architecture enforcement | G01-10/11 |
| T11 | Audit secret leakage | Critical | Medium | sanitizer + durable redaction tests | G01-09/22 |
| T12 | Audit tampering/unauthorized read | High | Medium | tenant-scoped RBAC + retention controls | G01-22 |
| T13 | Dependency supply-chain compromise | High | Medium | locked install + dependency scanning | G01-23 |
| T14 | Source-code secret leakage | Critical | Medium | secret scanning in CI | G01-23 |
| T15 | Key compromise | Critical | Low | KMS/HSM, workload identity and rotation | G01-20/21 |
| T16 | External application-layer vulnerabilities | Critical | Medium | independent penetration testing | G01-25 |

## 5. Abuse-case requirements

### AC-01 Refresh replay

A refresh token already used or no longer current must never yield another valid successor. The family and session become unusable on confirmed reuse.

### AC-02 Cross-tenant request

A valid identity bound to tenant A must not obtain a successful authorization result for tenant B.

### AC-03 Restart

A token/session created by instance A must remain valid after A terminates and instance B starts against the same PostgreSQL state, until expiry/revocation.

### AC-04 In-memory fallback

If PostgreSQL is unavailable, production authentication must fail closed rather than silently switching to an alternate in-memory runtime.

### AC-05 Audit secret injection

Security audit input containing password/token/authorization/bearer fields must persist without those protected fields.

### AC-06 Unauthorized audit access

Audit readers must have an explicit tenant-scoped permission. Tenant mismatch must return denial rather than data.

## 6. Security assumptions

- PostgreSQL credentials are supplied through deployment secret management, not source control.
- Production TLS termination and certificate lifecycle are external deployment responsibilities and require independent deployment evidence.
- KMS/HSM and independent penetration testing require external infrastructure/assessor availability.
- No JWT signing infrastructure is assumed until explicitly introduced.

## 7. Residual risks / open controls

The following remain open until independently proven:

- production password-hashing calibration review;
- MFA and secure account recovery;
- WebAuthn/Passkeys browser evidence;
- distributed/observable abuse controls across production topology;
- production browser cookie/CSRF policy;
- deployed TLS evidence;
- KMS/HSM-backed key custody and rotation;
- service-to-service workload identity;
- complete SAST/DAST/container/IaC evidence;
- final security architecture review;
- independent external penetration test.

## 8. Evidence linkage

The threat model is intentionally mapped to executable controls. A threat is not considered closed because this document describes a mitigation; closure requires the corresponding implementation, automated test, CI job and reviewable evidence required by `AFX-MASTER-ARCH-001 v2.0`.

## 9. Review rule

This document becomes **REVIEWED** only after a documented Architecture/Security Governance review records: reviewer identity/role, date, accepted residual risks, required follow-up controls and approval status. Until that record exists, threat-model status remains **IN PROGRESS**.
