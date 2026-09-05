# AFAGHX G01 Production Readiness Evidence Contract

**Purpose:** convert the remaining Gate-01 production dependencies into explicit, machine-checkable acceptance evidence without manufacturing PASS status.

## Required external evidence

| Control | Required production evidence | Minimum acceptance |
|---|---|---|
| G01-01 / G01-13 | Production-like Argon2id calibration | Node >=24.8, Argon2id, approved memory/time/parallelism, measured latency and concurrency on the actual deployment class |
| G01-11 | Deployed HTTP/API integration | Real deployed request path proves authentication context, tenant context and authorization; no mocked middleware-only evidence |
| G01-14 | Durable MFA integration | Persistent enrollment/challenge/recovery state, abuse controls, revocation and session interaction verified against the production data path |
| G01-15 | Durable WebAuthn deployment | Real HTTPS origin, production RP-ID, durable credential persistence and browser registration/authentication evidence |
| G01-16 | Recovery production abuse test | One-time expiring recovery credentials, rate limits, MFA-safe recovery semantics and session invalidation demonstrated |
| G01-17 | Shared edge rate limiting | Distributed/shared limiter under multiple application instances with observable enforcement and fail-closed behavior |
| G01-18 | Browser cookie/CSRF deployment | Secure/HttpOnly/SameSite policy plus CSRF enforcement verified against the deployed browser path |
| G01-19 | TLS/CORS/header deployment | Real TLS termination, strict HTTPS redirect/HSTS policy, explicit approved origins, and required security headers |
| G01-20 | KMS/HSM | Real provider-backed key version lifecycle: current -> rotate -> revoke, with least-privilege workload identity and audit evidence |
| G01-21 | Workload identity | Short-lived federated service identity; no shared static service credential; issuer/audience/subject/lifetime validation observed in deployment |
| G01-22 | Durable security audit | Persistent append-only audit records, integrity chain, retention enforcement and restricted access verified in production-like DB |
| G01-23 | DevSecOps | PR and protected-branch dependency, secret, SAST, DAST, container and IaC scans with zero unreviewed high/critical findings |
| G01-24 | Threat-model review | Security architecture review records threats, mitigations, residual risks and explicit acceptance/owner for remaining risk |
| G01-25 | Independent pentest | Qualified independent assessment with no open critical/high findings or formally accepted exceptions |
| G01-26 | Release gate | Protected branch gate remains fail-closed until every control is DONE and final architecture review is recorded |

## Evidence integrity rules

1. CI PASS is evidence of the tested code path, not proof of production deployment.
2. A mocked KMS, synthetic TLS certificate, fake workload identity, or fabricated pentest result is never acceptable closure evidence.
3. Secrets, tokens, credentials, private keys and recovery codes must never be committed or uploaded as artifacts.
4. Each production evidence record must identify the deployment revision, environment class, timestamp, test command/procedure and artifact digest.
5. The Gate-01 release policy remains deny-by-default while any row is `IN PROGRESS` or `BLOCKED`.

## Closure sequence

`production configuration -> deploy -> execute security evidence -> upload immutable evidence -> architecture review -> matrix reclassification -> protected-branch gate -> release`

This document is a contract for real closure. It does not itself constitute closure evidence.
