# Gate 01 — External and Review Dependencies

This document records controls that cannot honestly be marked DONE by repository code alone.

## G01-13 — Password hashing parameter review

Current code and CI benchmark the selected scrypt parameters.

Remaining dependency:
- explicit security review of the selected parameters and benchmark evidence.

No parameter change is required by this branch.

## G01-14 — MFA foundation

Remaining implementation:
- enrollment;
- challenge verification;
- recovery;
- revocation;
- abuse controls;
- production integration tests.

## G01-15 — WebAuthn / Passkeys

Remaining implementation and evidence:
- real browser registration and authentication ceremony;
- origin and RP-ID validation;
- credential lifecycle;
- Playwright/browser evidence.

## G01-16 — Secure account recovery

Remaining implementation and evidence:
- recovery workflow;
- one-time token/codes;
- MFA-aware authorization;
- takeover-abuse tests;
- real delivery/invalidation policy.

## G01-18 — CSRF and secure cookies

Current API uses Authorization-header bearer credentials and does not rely on ambient auth cookies.

Remaining dependency:
- security review of the no-cookie strategy;
- browser-level verification;
- any future cookie-auth path must enforce HttpOnly, Secure, SameSite and explicit CSRF protection.

## G01-19 — TLS and production edge

Repository policy and Gateway headers/CORS are defined.

Remaining dependency:
- actual production edge/load-balancer TLS configuration;
- certificate chain and TLS-policy verification;
- production endpoint evidence.

## G01-20 — KMS/HSM

BLOCKED pending:
- approved KMS/HSM service;
- IAM/workload identity;
- key rotation policy;
- end-to-end rotation evidence.

No fake/mock KMS acceptance is permitted.

## G01-21 — Workload identity

BLOCKED pending:
- approved workload-identity provider;
- short-lived service credentials;
- audience/scope validation;
- deployed service-to-service runtime.

No static shared credential is promoted as an equivalent.

## G01-24 — Threat model review

The repository now contains the threat model and executable mapping.

Remaining dependency:
- independent security review and recorded disposition for every high-risk threat.

## G01-25 — External penetration test

BLOCKED pending:
- approved test environment and scope;
- qualified independent assessor;
- penetration test report;
- remediation verification with no open critical/high findings.

## G01-26 — Production release security gate

The machine gate is already fail-closed against unresolved Matrix controls. It can become GREEN only after every other required control is DONE and the remaining external evidence is present.

## Non-negotiable

No control in this document is promoted to DONE by documentation alone.
