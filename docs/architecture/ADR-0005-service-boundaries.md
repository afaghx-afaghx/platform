# ADR-0005: Service Boundary Policy

- Status: Accepted
- Date: 2026-09-04

## Decision

A folder/module boundary does not automatically imply a separately deployable microservice.

A capability is extracted into an independent service when independent scaling, fault isolation, security boundary, release cadence, data ownership, or team ownership provides a measurable benefit.

## Consequence

AFAGHX may begin as a modular monorepo while preserving boundaries that make later extraction predictable. Premature microservice proliferation is explicitly avoided.
