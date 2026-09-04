# AFX-CORE Gate 01 — Dependency-Ordered Closure Execution Plan

## Mandate

AFX-CORE Gate 01 is a hard architecture gate. No new business Domain may be introduced, scaffolded, or integrated until all blocking controls reach `DONE` and the Gate CI is green.

## Dependency order

```text
G01-01 Durable persistence
      ↓
G01-02 Transactional refresh rotation + concurrency
      ↓
G01-03 HTTP security boundary + integration tests
      ↓
G01-04 Browser MFA / WebAuthn + recovery
      ↓
G01-05 Rate limiting / abuse controls
      ↓
G01-06 KMS/HSM key lifecycle + rotation
      ↓
G01-07 Workload identity / service credentials
      ↓
G01-08 Persistent audit + redaction / retention
      ↓
G01-09 SAST / dependency / secret / container / IaC gates
      ↓
G01-10 Threat model + adversarial security tests
      ↓
G01-11 External penetration test
      ↓
GATE 01 GREEN
```

## Closure matrix

| ID | Status | Owner | Primary files | Required tests | CI evidence | Exit criterion |
|---|---|---|---|---|---|---|
| G01-01 | IN PROGRESS | AFX-CORE Persistence | `core/AFX-CORE/src/` | repository restart, multi-instance, unique constraints | `gate-01-persistence` | DB-backed identity/membership/session/refresh state is authoritative |
| G01-02 | IN PROGRESS | AFX-CORE Session | `core/AFX-CORE/src/` | parallel refresh, replay, transaction rollback | `gate-01-concurrency` | exactly one refresh wins; reuse revokes family atomically |
| G01-03 | IN PROGRESS | AFX-CORE API Security | `core/AFX-CORE/` | HTTP authn/authz, CSRF, CORS, headers, error normalization | `gate-01-http` | browser/API boundary is tested end-to-end |
| G01-04 | BLOCKED | Identity Security | `core/AFX-CORE/` + web integration | WebAuthn browser flow, MFA enrollment/challenge/recovery | `gate-01-webauthn` | real browser-level ceremony and recovery abuse tests pass |
| G01-05 | BLOCKED | Edge Security | gateway/security integration | credential stuffing, IP/user throttling, lockout/risk tests | `gate-01-abuse` | rate/risk controls enforce bounded authentication abuse |
| G01-06 | BLOCKED | Platform Security | infra/security configuration | key generation, rotation, old-key verification window, failure tests | `gate-01-kms` | production key lifecycle is externalized and rotation is evidenced |
| G01-07 | BLOCKED | Platform Identity | service identity layer | service authentication, audience/scope, credential expiry | `gate-01-workload-identity` | no static shared service secrets remain as identity primitive |
| G01-08 | BLOCKED | Audit/Compliance | `core/AFX-CORE/` + persistence | persistence, redaction, retention, tamper/ordering checks | `gate-01-audit` | security events are durable, redacted and queryable |
| G01-09 | IN PROGRESS | DevSecOps | `.github/workflows/` | SAST, dependency, secret, container/IaC scans | `gate-01-devsecops` | required scanners fail closed on actionable findings |
| G01-10 | BLOCKED | Security Architecture | `docs/security/` + tests | threat-model abuse cases, authz fuzzing, negative paths | `gate-01-threat-model` | all high-risk threats have mitigation + executable evidence |
| G01-11 | BLOCKED | Independent Security | external scope/report | penetration test + remediation verification | `gate-01-pentest` | no unresolved critical/high auth findings |

## Operating rules

1. `DONE` means implementation exists, test exists, CI evidence exists, and exit criterion is independently verifiable.
2. `IN PROGRESS` means implementation work has started but the control is not releasable.
3. `BLOCKED` means a prerequisite, infrastructure capability, or independent verification is missing.
4. A green unit-test job alone never changes a production control to `DONE`.
5. Any regression reopens the control and the Gate.
6. New Domains remain frozen while any Gate 01 control is not `DONE`.

## Immediate execution sequence

### Wave 1 — State correctness
- Replace in-memory authentication state with durable repositories.
- Define database constraints and transactional boundaries.
- Implement atomic refresh-token rotation and family revocation.
- Add concurrency/race tests.

### Wave 2 — Protocol boundary
- Add HTTP integration layer.
- Enforce TLS assumptions, secure headers, strict CORS and CSRF strategy.
- Verify error normalization and tenant authorization through real HTTP requests.

### Wave 3 — Strong user authentication
- Implement browser-level WebAuthn/passkeys.
- Add MFA enrollment, challenge, recovery and abuse controls.
- Test ceremony failure, replay, origin/RP-ID mismatch and recovery abuse.

### Wave 4 — Operational security
- Add rate limiting and credential-stuffing defenses.
- Integrate KMS/HSM-backed key lifecycle and rotation where asymmetric/service credentials are used.
- Add workload identity for service-to-service authentication.
- Persist audit events with redaction and retention policy.

### Wave 5 — Assurance
- Add SAST, dependency, secret, container and IaC security gates.
- Complete threat model and adversarial tests.
- Run independent penetration test and close findings.

## Gate decision

`GATE 01 = GREEN` only when every row is `DONE`, all required CI jobs are green, evidence is retained, and no critical/high unresolved security finding remains.

Until then: **DOMAIN FREEZE = ON.**
