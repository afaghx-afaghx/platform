# MISSION-001 — Offline Provider Validation

## Objective

Prove that the AFAGHX governed AI provider boundary can execute a complete provider operation without an external API, network access, credentials, or API credits.

## Scope

- deterministic provider interface
- provider-policy boundary
- governed AI Gateway routing
- mock provider implementation
- provider registry entry
- contract and gateway integration tests
- PR CI execution
- machine-readable, auditable evidence

## Non-goals

- replacing OpenAI in production
- claiming model-quality reasoning from mock output
- bypassing human review or governance gates
- granting the provider architecture or merge authority

## Acceptance criteria

1. `plan`, `implement`, `review`, and `summarize_evidence` operations execute successfully offline through the AI Gateway.
2. Unknown operations fail closed.
3. Identical input produces identical output hashes.
4. Mock `execute` mode is denied by provider policy.
5. Evidence records mission/version, provider/version, operation, model, run ID, Git SHA, input/output hashes, timestamps, duration, and status.
6. Evidence explicitly records `network_access=false` and `api_credits_required=false`.
7. PR CI passes without `OPENAI_API_KEY`.
8. The mock provider is not an independent final reviewer.

## Evidence

The workflow `.github/workflows/mission-001-offline.yml` runs on relevant pull requests and can also be dispatched manually. It executes contract and gateway tests, runs the mission through the governed gateway, and creates a machine-readable evidence artifact. A successful run is required before MISSION-001 can be marked GREEN.

## Production boundary

The mock provider is a validation provider only and is restricted to planning/audit gateway modes. OpenAI remains a separate production provider. When API credits are available, the governed command center can use the OpenAI provider without changing the provider contract.
