# AFAGHX AI Engineering System

The `.ai` tree is the policy and control-plane layer for AFAGHX engineering agents.

## Control planes

- `command-center.yaml` — execution policy and hard stops
- `architecture/` — system, ownership, dependency and module maps
- `contracts/` — agent/module/evidence contracts
- `providers.yaml` — model/provider routing without coupling architecture to a vendor
- `providers/` — provider adapter contract
- `workflows/` — governed engineering lifecycle
- `evidence/` — evidence schema and provenance rules
- `policies/` — repository-wide AI engineering policy

## Agent separation

Implementation, security review, testing, evidence audit and release gating are separate responsibilities. A model may assist multiple roles, but no implementation result is self-approved as final evidence.

## Operating principle

AI accelerates engineering; it does not become the security authority, architecture authority, merge authority or production deployment authority.
