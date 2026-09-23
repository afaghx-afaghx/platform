# ADR-002 — Canonical Experience Architecture Naming

**Status:** ACCEPTED
**Date:** 2026-09-23
**Authority:** AFAGHX Architecture Governance

## Decision

The canonical architectural name for the AFAGHX Experience layer is:

- **Display / product name:** AFAGHX EXPERIENCE
- **Architecture code:** AFX-EXPERIENCE

`AFX-EXPERIENCE` replaces generic architectural layer identifiers such as `EXPERIENCE` where a canonical AFAGHX architecture identifier is required.

## Scope

This decision applies to architecture registries, system maps, dependency graphs, ownership maps, architecture specifications, architecture tests, and Experience contracts.

The filesystem directory `experience/` is retained because it is an implementation path, not an architectural identifier. No unnecessary repository restructure is authorized by this ADR.

## Boundary

AFX-EXPERIENCE remains presentation-only. It consumes approved APIs and application boundaries and must not own canonical domain truth or direct database access.

## Governance

No parallel Experience architecture code may be introduced without an ADR. Existing generic prose references to “Experience” may remain when used as ordinary English rather than as an architectural identifier.
