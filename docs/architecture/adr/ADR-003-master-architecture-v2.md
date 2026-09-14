# ADR-003 — AFX-MASTER-ARCH-001 V2.0

**Status:** PROPOSED FOR ARCHITECTURE REVIEW
**Date:** 2026-09-14
**Parent:** #55

## Context

AFAGHX requires one enforceable master architecture across Core, Platform, Domain, Intelligence, Experience, Infrastructure and Engineering/Governance. The existing v1 architecture established the correct spine but did not make canonical runtime wiring, machine-checkable closure, and infrastructure evidence explicit enough for whole-repository finalization.

## Decision

Adopt `AFX-MASTER-ARCH-001 V2.0` as the next master implementation baseline.

V2.0 preserves the existing architectural spine and strengthens it with:

- explicit seven-layer model;
- bounded-context and entity ownership requirements;
- singular canonical authentication runtime;
- explicit prohibition of production-reachable in-memory Core;
- explicit infrastructure trust boundary;
- versioned API/event requirements;
- governed intelligence/AI boundary;
- four-team ownership;
- evidence-backed GREEN definition;
- machine-checkable compliance matrix.

## Canonical runtime

`HTTP → Gateway → PersistentAfxCore → PostgresAfxCoreRepository → PostgreSQL`

## Consequences

Positive:
- one architecture source of truth;
- less ambiguity between documentation and runtime;
- stronger automated enforcement;
- clearer ownership and release gates.

Negative:
- current repository will expose additional gaps during compliance audit;
- infrastructure and runtime work cannot be hidden behind documentation;
- unresolved controls remain RED/BLOCKED until real evidence exists.

## Rejection criteria

This ADR must not be considered accepted if any implementation-critical dependency, runtime path, ownership boundary or security authority remains contradictory or unproven.

## Approval

Architecture approval requires human review of the V2 master specification and compliance matrix. Merge does not imply production security GREEN.
