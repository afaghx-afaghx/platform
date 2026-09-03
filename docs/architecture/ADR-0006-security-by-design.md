# ADR-0006: Security by Design

- Status: Accepted
- Date: 2026-09-04

## Decision

Security is an architectural property enforced at every trust boundary.

## Baseline

- deny by default
- centralized authentication
- explicit authorization
- explicit tenant context
- immutable/auditable security events where required
- no secrets in Git
- dependency and secret scanning in CI
- least privilege for humans, services, and automation
- production approval gates
- correlation IDs for traceability

## Consequence

Security controls are designed alongside functionality, not added after feature completion.
