# AFX-FOUR-PROTOCOL-CONTROL-PLANE-001 v1.0

**Status:** Proposed implementation; production authorization remains RED until independently verified runtime evidence passes.  
**Scope:** AFAGHX architecture changes, AI-assisted engineering changes, release candidates, and production promotion.  
**Normative rule:** `UNKNOWN` is never `GREEN`; missing, stale, untrusted, altered, mocked, or SHA-mismatched evidence fails closed.

## Objective

Create one machine-checkable release contract that prevents the phrase “9.5/10” from becoming a subjective claim. The score is an output of four protocol evaluations, not a promise or a self-assessment. CI passing validates the control engine; it does not assert the current production system is healthy.

## Four independent control protocols

### P1 — Architecture and boundary integrity

Proves the constitutional architecture and ownership rules: AFX-CORE is the only identity/authentication/authorization authority; tenant isolation is enforced; domain data ownership and public contracts are explicit; EXPERIENCE cannot bypass the governed platform or access databases directly; architectural changes have an ADR or a signed non-applicability decision; and architecture tests target the exact candidate SHA.

### P2 — Runtime security and fail-closed behavior

Proves request-security ordering, deny-by-default authorization, tenant isolation, input/contract validation, secret scanning, dependency/supply-chain checking, Core security tests, secret-store ownership, audit/observability, and failure behavior. Missing security evidence, an unknown provider/verifier result, or an authority-boundary breach is a hard blocker.

### P3 — Evidence provenance, freshness, integrity and trusted verification

Requires a complete Evidence Envelope bound to one 40-character candidate SHA; source and verification method; workflow run and artifact/log URI; nonzero artifact SHA-256; timestamps and expiry; explicit `mocked: false`; a trusted out-of-band verifier registry; and an Ed25519 signature. The trust registry comes from the protected `AFX_TRUSTED_VERIFIERS_JSON` runtime environment, not from the evidence file. Keys must never be inferred from an envelope or an unreviewed PR change.

### P4 — Release, live infrastructure and human approval

Proves public DNS for apex/API, valid TLS and a real expected unauthenticated endpoint response, deployment SHA equality, Chromium smoke against the published site, success of mandatory CI gates, authorized human approval of the exact SHA, traceable production approval, rollback/alerting readiness, no open release blockers, and post-deployment evidence. A local-server browser test is not production proof.

## Scoring contract

- Four protocols, each with ten one-point controls; total scale is 10.
- `PASS = 1.0`, `PARTIAL = 0.5` only for non-critical controls, `FAIL = 0`, `UNKNOWN = 0`.
- All four protocol scores must be at least **9.5/10** and the weighted aggregate must be at least **9.5/10**.
- Every critical control must be `PASS`; evidence validation errors reduce the affected control to zero and create a blocker.
- The aggregate cannot overrule a failed critical control. A 9.9 score with a critical security, DNS, HTTPS, provenance, exact-SHA, or human-approval failure is still `RED`.
- An untrusted, unsigned, tampered or missing envelope yields `score: null`, not a fabricated numerical score.
- `PROVEN` means only that the submitted, trusted, fresh and correctly signed envelope satisfies this release contract for the exact subject SHA. Production is still blocked until the release workflow actually publishes and verifies the same SHA.

## Evidence Envelope contract

The evidence envelope contains `schema_version`, `run_id`, `created_at`, `expires_at`, `subject`, one result for every configured control, `integrity`, and `signature`. The subject must include `implementation_actor_id`. Each control result binds status, observation timestamp, source SHA, verifier ID, evidence kind, source system/reference ID, HTTPS URI, SHA-256 digest, an explicit digest-verification attestation, captured timestamp, verification method, exit result where applicable, `mocked: false`, and a per-control `attestation`. Each control attestation is an Ed25519 signature by the public-key identity registered for `verified_by`; its signed payload binds the control result to the envelope run ID, repository, and candidate SHA. The trusted envelope attestor and every control verifier must have registered actor identities distinct from the implementation actor. The attestor is responsible for checking that the referenced source really matches its digest; the evaluator does not silently treat a hash-shaped string as proof that a remote artifact was fetched and re-hashed.

Integrity is SHA-256 over canonical JSON of the envelope core (excluding `integrity` and `signature`). The envelope Ed25519 signature covers the canonical pair `{ core, integrity }`. In addition, every control has a separate Ed25519 attestation verifiable with that control verifier's registered public key. The evaluator validates both layers of signatures, the configured public keys from the protected runtime trust registry, verifier role/actor independence, and the binding of each signed control to the run ID, repository and candidate SHA. Altering any signed content, replaying an expired envelope, substituting an artifact, changing the candidate SHA, or supplying a self-declared trust key is rejected.

## State machine

`UNKNOWN → (trusted fresh evidence evaluated) → RED | PROVEN`

- `UNKNOWN`: no complete evidence has been supplied; it is never a pass.
- `RED`: an explicit policy, control, score, evidence, freshness, trust, infrastructure or governance requirement failed.
- `PROVEN`: every critical control passed, the four protocol floors and aggregate floor passed, and there are no control/evidence blockers.
- `PRODUCTION_READY`: separate promotion state requiring deployed-SHA and post-deployment evidence plus authorized production approval. This implementation does not automatically grant it.

## Operational sequence

1. Validate the policy and evaluator with deterministic unit tests.
2. Provision trusted verifier public keys through the protected GitHub environment / trusted runtime configuration. Do not put private keys in Git.
3. Collect real signed evidence for all 40 controls on one exact candidate SHA.
4. Run the evaluator with `--evidence <path> --sha <candidate-sha>` and the protected `AFX_TRUSTED_VERIFIERS_JSON` value.
5. If any protocol is below 9.5, any critical control is not `PASS`, or any blocker exists, keep the gate `RED` and do not deploy.
6. After the DNS/API blocker is resolved, repeat the exact-SHA CI and published-site Chromium check; obtain independent authorized human approval; preserve artifacts and digests.
7. Promote only the verified SHA; verify post-deployment health before assigning `PRODUCTION_READY`.

## Non-goals and explicit limitations

This gate does not repair domain registrar state, create an API host, grant GitHub reviewer authority, or run the protected self-hosted Golden Task runner. Those require the domain/hosting owner, authorized human reviewer, or configured runner. It also does not equate this policy test workflow with an actual production score. Until the external trust registry and complete live evidence envelope exist, the operational result is **RED / NOT PROVEN**.

## Implemented assets

- `.ai/controls/four-protocol-quality-gate.json` — four-protocol policy and thresholds.
- `.ai/runtime/four-protocol-quality-gate.mjs` — deterministic policy validator, signed-envelope verifier, freshness/provenance/SHA checks and scorer.
- `.ai/runtime/four-protocol-quality-gate.test.mjs` — positive and negative contract tests.
- `.github/workflows/four-protocol-control-gate.yml` — CI execution and evidence artifact publication.
- `.github/workflows/ai-evidence-gate.yml` — existing AI Evidence Gate now invokes the policy validator and four-protocol contract tests.
