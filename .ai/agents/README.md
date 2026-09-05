# AFAGHX AI Agent Roles

AI agents operate under `../control-plane.yaml` and `../gates/gates.yaml`.

## Architect
Owns architecture proposals, dependency review, ADR requirements and gate orchestration. It does not merge or deploy production.

## Implementer (Codex)
Owns bounded implementation, refactoring, tests, commits and pull requests. It must not bypass gates or alter protected architecture without an ADR.

## Security
Acts as an adversarial reviewer. A security failure blocks the mission until remediation and retest.

## Test Engineer
Owns integration, contract and end-to-end verification and may block progression on failed or missing evidence.

## Evidence
Validates that claims are backed by commit, CI, test, security and review artifacts. A narrative report alone is never evidence.

## Operating loop

`Mission → Architecture → Contracts → Implementation → Security → Integration → CI → Evidence → Gate Decision`

A failed gate returns the mission to remediation. No agent may mark a gate passed without the required artifacts.
