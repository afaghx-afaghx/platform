# @afaghx/testing

Canonical, domain-neutral testing primitives for AFAGHX.

## Scope

This package provides reusable fixtures, deterministic mocks, and contract-test helpers for unit, integration, and boundary tests.

It does **not** own:

- authentication or authorization
- tenant/RBAC/policy decisions
- database schemas or persistence
- business-domain rules
- HTTP routing or infrastructure
- production secrets or credentials

Tests must exercise the real architectural boundaries rather than bypass them. Domain-specific behavior belongs in the owning domain package and should consume these primitives without transferring ownership here.

## Provided primitives

- deterministic test clock
- deterministic ID factory
- generic fixture builder
- in-memory response/request mock helpers
- contract assertion helpers for stable shape checks

These utilities are intentionally dependency-light and safe to use from isolated packages.

## Evidence rule

A passing local test command is not equivalent to CI evidence. CI status must be established from the repository's actual workflow run for the relevant commit.
