# AFX-AI-ASTRA-001 — Live Provider Readiness Gate

This gate is evidence-driven and fail-closed.

## GREEN rules

- LIVE_PROVIDER: real non-MOCK provider plus successful health evidence.
- API_CREDIT: explicit credit confirmation plus a non-secret evidence reference.
- SECRETS: approved secret-store readiness plus a non-secret reference; never expose secret values.
- PROVEN: live provider + credit + secrets + runtime validation + cost/usage evidence + rollback/compensation evidence + FINAL GATE + CI + closure gate.
- PRODUCTION: PROVEN plus explicit production evidence.
- PR_MERGE: PROVEN plus CI and closure gate green.

`<MOCK>` can never satisfy LIVE_PROVIDER.

Missing, ambiguous, or unverifiable evidence remains RED.

## Promotion chain

Readiness Gate → Secret Store Boundary → Provider Health Check → Cost/Usage Evidence → Idempotency → Live Adapter → Runtime Evidence → FINAL GATE → PROVEN

No live credentials are stored in this document or in readiness evidence.
