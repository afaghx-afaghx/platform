# AFAGHX Production Security Infrastructure Contract

This directory contains provider-neutral production security contracts for AFX-CORE Gate 01.

## Non-negotiable rules

- No plaintext long-lived application credential is committed to the repository.
- Production key material never lives in GitHub repository contents.
- KMS/HSM access must use least privilege and short-lived workload identity where supported.
- Rotation evidence must prove old/new key versions, successful cutover, revocation of the retired version, audit correlation, and timestamps.
- Workload identity must validate issuer, audience, subject, and bounded token lifetime.
- Missing production configuration fails closed; it is never converted into synthetic PASS evidence.

## Required production evidence

1. Provider identity configuration and trust policy (redacted, non-secret).
2. Key lifecycle record: create -> current -> rotate -> revoke.
3. Workload identity exchange record with token metadata only (no bearer token contents).
4. TLS termination and approved-origin configuration evidence.
5. Shared rate-limit backend health and abuse-test evidence.
6. Durable MFA/WebAuthn persistence evidence.
7. Independent penetration-test report.

The contracts in this directory define the expected shape. They do not claim that a provider or production environment exists.
