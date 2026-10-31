# AFAGHX Affiliate Revenue and Finance Domain

This bounded context owns affiliate campaign CPC rules, signed attribution links, click qualification, and immutable financial journal posting. It does not own identity, RBAC, tenant resolution, or the event bus.

## Trust boundaries

- The Gateway verifies access tokens and permissions. The Domain service accepts the Gateway-verified immutable SecurityContext for all authenticated operations.
- Public click tracking accepts only a short-lived HMAC-signed campaign/affiliate token. The token contains tenant, campaign, affiliate and expiration claims.
- Tenant ownership is taken from signed attribution for public clicks and from SecurityContext for all private campaign, review and ledger operations.
- The public request cannot choose its advertiser or tenant. The campaign owner is the authenticated user; managers can issue affiliate links only under the explicit affiliate-manager role/permission.
- Raw IP, visitor and user-agent values are never written to the click table. The service stores keyed HMAC digests and only the referrer host. IP derivation uses the socket peer; arbitrary X-Forwarded-For headers are not trusted.
- Redis Gateway rate limits protect the public click endpoint. The domain also applies deterministic visitor/network velocity rules; those signals are risk triage, not proof of a human or fraud.

## Click lifecycle

`raw → qualified`, `raw → pending_review → qualified`, or `raw/pending_review → rejected`. A click with a low risk score is qualified automatically; medium risk is held for explicit finance review; high risk is rejected. Repeated `Idempotency-Key` values replay the original click result and a changed fingerprint conflicts.

A click becomes financially qualified only when its journal header, balanced entries, campaign-budget update, click status and outbox events are committed in the same PostgreSQL transaction. The click record's database constraint requires a ledger transaction identifier for the `qualified` status.

## CPC accounting model

For a campaign with gross CPC charge **G** and affiliate reward **R**, where `0 < R <= G`:

| Account | Debit | Credit |
|---|---:|---:|
| advertiser_receivable | G | — |
| affiliate_payable | — | R |
| platform_commission_revenue | — | G − R (only when positive) |

Amounts use `NUMERIC(20,6)` and decimal strings. JavaScript floating point is not used for monetary calculations. Entries and posted transaction headers are append-only. Reversals create a new balanced transaction with the original debits and credits swapped; the original is not edited.

The database has deferred constraint triggers that independently verify at commit that a journal has at least two entries, a single currency, and equal debit/credit totals matching the header. Immutable triggers reject UPDATE/DELETE.

## API surface

- `POST /v1/affiliate/campaigns` — permission `domain:marketing:write`
- `POST /v1/affiliate/campaigns/:campaignId/click-token` — permission `domain:marketing:write`
- `POST /v1/affiliate/clicks` — public, Redis IP rate-limited, HMAC token required, `Idempotency-Key` required
- `POST /v1/affiliate/clicks/:clickId/review` — permission `finance:affiliate:review`
- `GET /v1/finance/ledger` and `GET /v1/finance/ledger/:transactionId` — permission `finance:ledger:read`
- `POST /v1/finance/ledger/:transactionId/reverse` — permission `finance:ledger:reverse`

The Affiliate and Finance Experience modules are thin clients of these APIs. They must not calculate or mutate commissions locally.

## Migration and secrets

Apply `domains/runtime/migrations/002-transactional-outbox.sql`, then `domains/affiliate/migrations/001-affiliate-click-revenue-ledger.sql`.

Configure `AFX_AFFILIATE_SIGNING_SECRET` and `AFX_PRIVACY_HASH_SECRET` with independently generated values of at least 32 bytes. Set `ENABLE_AFFILIATE_FINANCE=true` only after both secrets and the migration have been provisioned. Do not commit secret values.

## Not yet delivered

This first release is CPC click accrual only. Conversion/revenue-share attribution, advertiser pre-funding, settlement batches, payout rails, tax/VAT, invoices, multi-currency FX, dispute workflow beyond journal reversal, affiliate KYC/AML and regulatory/legal review are separate capabilities and are not implied by this implementation.
