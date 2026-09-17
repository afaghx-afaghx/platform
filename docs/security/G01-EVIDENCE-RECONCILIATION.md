# G01 Evidence Reconciliation

Date: 2026-09-17

This document records the evidence-first reconciliation of AFX-CORE Gate 01 controls G01-10 through G01-26.

## Proven / Near-Proven

- G01-10: PostgreSQL-backed identity/membership/session persistence, restart/recreation, revocation and concurrent refresh tests are present in the AFX-CORE security suite.
- G01-11: Canonical `/v1/auth/context` implements authenticated `200`, missing/invalid token `401`, and tenant mismatch `403`; final CI evidence-contract mapping remains to be closed.
- G01-12: Concurrent refresh testing demonstrates a single successful winner and a rejected competing refresh; final CI evidence-contract mapping remains to be closed.

## Still Open

G01-13 through G01-19 and G01-21 through G01-24 require the implementation and/or evidence listed in the Closure Matrix. They must not be marked DONE merely because related code exists.

## External Blockers

- G01-20 KMS/HSM-backed key management and rotation requires an approved external KMS/HSM, IAM/workload identity, rotation and audit evidence.
- G01-25 external penetration testing requires an independent assessor, production-like staging scope, remediation and retest evidence.

## Release Rule

G01-26 remains IN PROGRESS until every prerequisite control is genuinely closed and the required CI/evidence checks are green. This document does not override the Closure Matrix; it records the reconciliation basis and prevents artificial GREEN status.
