# AFAGHX Score Evidence Contract v1.0.0

## Purpose

This contract defines the canonical machine-readable record used by the AFAGHX Score Engine for exactly 14 gates.

The contract is evidence-first:

- A gate without valid bound evidence has `gate_score = 0.0`.
- `BLOCKED` is always scored as zero and cannot be masked.
- Evidence must bind to a 40-character commit SHA (`subject_sha`).
- Valid evidence must provide an evidence URL and a SHA-256 digest.
- Evidence records are observations, not manual approvals.
- The Score Engine must reject malformed records, invalid hashes, unsupported gate types, or impossible counts.
- The evidence record itself is not proof of the underlying control; it is the machine binding envelope for externally generated proof.

## Canonical gate types

### controls

Required counts:

`total, done, in_progress, blocked, not_started`

The counts must satisfy:

`done + in_progress + blocked + not_started = total`

Gate score:

`10 × ((done × 1.0) + (in_progress × 0.3) + (blocked × 0.0) + (not_started × 0.0)) / total`

For `total = 0`, the gate is invalid and must score 0.0.

### runtime_proof

Required counts:

`total_surfaces, proven, partial, open`

The counts must satisfy:

`proven + partial + open = total_surfaces`

Gate score:

`10 × ((proven × 1.0) + (partial × 0.3) + (open × 0.0)) / total_surfaces`

For `total_surfaces = 0`, the gate is invalid and must score 0.0.

### binary

Required field:

`binary.proven`

Gate score:

- proven = true → 10.0
- proven = false → 0.0

## Evidence status

`VALID` means the evidence payload is present, bound to `subject_sha`, and its SHA-256 digest verifies.

`MISSING` means no evidence has been bound. The gate score MUST be 0.0.

`INVALID` means an evidence record exists but fails schema, binding, or digest validation. The gate score MUST be 0.0 and the Score Engine MUST fail the verification step.

## Hash rule

`evidence_hash` is the SHA-256 of the canonical evidence payload represented by the record, excluding the `evidence_hash` field itself.

Canonical serialization MUST be deterministic. Keys must be ordered lexicographically and encoded as UTF-8 JSON without insignificant whitespace.

The Score Engine is responsible for implementing and verifying this rule.

## SHA binding rule

`subject_sha` identifies the exact commit being assessed.

The bootstrap records created on Day 3 intentionally bind to:

`a944dfab081ac7cda5365ae469c7881ae9ab7b52`

because that is the last proven Score Engine branch commit before the Day 3 evidence-contract changes.

A later CI-generated evidence set MUST bind to the commit actually being evaluated.

## No-fabrication rule

Bootstrap records use `evidence_status = MISSING` and `gate_score = 0.0`.

They contain no invented workflow URLs, test results, control counts, external reports, or security claims.

They are placeholders for machine state, not proof of completion.

## Schema

The normative JSON Schema is:

`docs/scoring/evidence.schema.json`

## Required files

Exactly one canonical record is maintained for each gate:

`G1_evidence.json` through `G14_final.json`.
