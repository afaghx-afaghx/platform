# AFX-AI-ASTRA-001 — Live Provider Readiness Gate

This gate is evidence-driven and fail-closed.

## Current enforcement result

**All readiness rows remain RED until a trusted evidence verifier is implemented and connected.**

The following environment variables are declarations, not proof:
- Provider name and health
- API-credit confirmation and evidence reference
- Secret-store readiness and secret reference
- Runtime, cost/usage, rollback, CI, closure and Final Gate flags
- Production evidence

The readiness evaluator records whether these prerequisites were declared, but deliberately does not promote any status to GREEN. A non-empty reference or an operator-set boolean does not verify artifact provenance, integrity, freshness, origin, approval or execution.

## GREEN rules — not yet implemented

- LIVE_PROVIDER: real non-MOCK provider plus independently verified health evidence.
- API_CREDIT: credit confirmation plus verified, non-secret evidence.
- SECRETS: approved secret-store readiness plus verified non-secret reference; never expose secret values.
- PROVEN: live provider + credit + secrets + runtime validation + cost/usage evidence + rollback/compensation evidence + FINAL GATE + CI + closure gate, all verified by a trusted verifier.
- PRODUCTION: PROVEN plus independently verified production evidence.
- PR_MERGE: all required proof and policy checks, plus independent review and green CI/closure gates.

The MOCK provider can never satisfy LIVE_PROVIDER.

## Promotion chain

Readiness Gate → Secret Store Boundary → Provider Health Check → Cost/Usage Evidence → Idempotency → Live Adapter → Runtime Evidence → FINAL GATE → trusted evidence verification → PROVEN

**Current blocker:** the trusted verifier and promotion authorization are not wired. The readiness script intentionally cannot issue PROVEN, PRODUCTION or PR_MERGE approvals. Do not work around this by setting repository variables.

No live credentials are stored in this document or in readiness evidence.
