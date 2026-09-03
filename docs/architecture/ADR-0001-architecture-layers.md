# ADR-0001: Five-Layer AFAGHX Architecture

- Status: Accepted
- Date: 2026-09-04

## Decision

AFAGHX uses five architectural layers: AFX-CORE, AFX-PLATFORM, DOMAIN, INTELLIGENCE, and EXPERIENCE.

## Context

The platform must evolve across many business capabilities while preserving centralized trust, tenant isolation, and independent domain ownership.

## Consequences

Positive:
- clear ownership boundaries
- centralized security foundation
- controlled dependency direction
- incremental service extraction
- lower risk of cross-domain coupling

Trade-off:
- more governance is required before adding new modules
- some capabilities may remain modular within one deployment until independent deployment is justified

## Rejected alternative

A feature-first monolith in which every feature owns its own authentication, users, permissions, and shared database was rejected because it creates duplicated trust boundaries and makes future decomposition expensive.
