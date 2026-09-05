---
name: security-review
description: Adversarial security review for authentication, authorization, tenant isolation, secrets and HTTP/API boundaries.
---
# Security Review

Treat all caller input as untrusted. Verify the canonical flow through AFX-CORE.

Required checks where applicable: authentication enforcement, authorization deny-by-default, tenant binding, session/token handling, secret exposure, secure logging, HTTP boundary controls, rate limiting, CORS/security headers, dependency risk and auditability.

Report RED/UNKNOWN/GREEN with exact evidence. Do not self-approve.
