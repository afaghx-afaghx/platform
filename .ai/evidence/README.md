# AFAGHX Evidence Contract

Evidence is the only basis for gate closure.

Every completed mission should collect, where applicable:

- source commit SHA
- pull request number and review result
- GitHub Actions run and required check results
- unit, integration, contract and E2E test results
- security scan results
- dependency scan results
- architecture/ADR references
- migration and rollback evidence
- runtime/observability evidence

A report may summarize evidence but cannot replace it.

Evidence must be traceable to the exact commit under review. If a required artifact is missing, the gate remains BLOCKED.
