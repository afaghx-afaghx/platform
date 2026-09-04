# AFAGHX Gap Register v1

This register prevents incomplete controls from being mistaken for production readiness.

| Area | Target | Current baseline | Release blocker |
|---|---|---|---|
| Identity/Auth | Complete credential lifecycle | Foundation | Yes |
| MFA | TOTP + WebAuthn/passkeys + recovery | Not complete | Yes |
| Sessions | Revocation, rotation, device/risk controls | Partial | Yes |
| Authorization | RBAC + policy/resource/assurance semantics | Partial | Yes |
| Key lifecycle | JWKS, rotation, KMS/HSM boundary | Partial | Yes |
| Tenant isolation | API/DB/cache/event/search/file enforcement | Partial | Yes |
| Audit | Durable taxonomy, integrity, monitoring | Foundation | Yes |
| API | v1, errors, correlation, idempotency, rate limits | Partial | Yes |
| Events | Outbox/Inbox, publisher, retry, DLQ, replay | Foundation | Yes |
| Data | Ownership, classification, retention, restore | Partial | Yes |
| Observability | Logs, metrics, traces, SLI/SLO | Partial | Yes |
| CI/CD | tests + security + migration gates | Partial | Yes |
| Domains | Bounded contexts and implementations | Not started | No, until foundation gates pass |
| Intelligence | Governed data/AI contracts | Architecture | No, until data foundation |
| Experience | Web/admin/partner/mobile | Architecture | No, until contracts stabilize |
| DR/BCP | Tested RPO/RTO and recovery | Not complete | Yes |

## Release rule

No release may be labeled production-ready while a release-blocking row lacks implementation and automated evidence.

## Execution order

1. Gate 01 — Trust Foundation
2. Gate 02 — Platform Foundation
3. Gate 03 — Data Foundation
4. Gate 04 — Domain Foundation
5. Gate 05 — Intelligence & Experience
6. Gate 06 — Production Readiness

The register is normative for engineering planning and review.
