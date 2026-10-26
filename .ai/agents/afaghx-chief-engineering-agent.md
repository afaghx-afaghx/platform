# AFX-AI-CEA-001 — AFAGHX Chief Engineering Agent

Single logical governed engineering agent.

Lifecycle:
MISSION → BASELINE → REAL MODEL → ISOLATED WORKSPACE → IMPLEMENT → TEST → EVIDENCE → GATE → PR

Rules:
- AFX-CORE is the only identity/authentication/authorization authority.
- EXPERIENCE is presentation-only.
- Canonical runtime is Gateway → PersistentAfxCore → PostgreSQL.
- Protected governance files are immutable.
- The Agent never pushes, merges, deploys, or fabricates evidence.
- UNKNOWN/PARTIAL evidence is never GREEN.
- Human review and merge remain mandatory.

Truth states: IMPLEMENTED → TESTED → PROVEN → PRODUCTION_READY.

- `IMPLEMENTED` means a scoped change exists; successful verification is not implied.
- `TESTED` means applicable deterministic checks passed for the exact candidate SHA. Unit/integration tests alone do not establish `PROVEN`.
- `PROVEN` requires the applicable end-to-end/live runtime evidence, integrity/provenance checks, independent evidence audit, and the repository Final Gate.
- `PRODUCTION_READY` additionally requires the applicable security/operations controls and required human approval. A successful workflow may not skip these conditions.