# ADR-0002: Explicit Multi-Tenant Context

- Status: Accepted
- Date: 2026-09-04

## Decision

Tenant context is a first-class security primitive owned by AFX-CORE. Protected requests must establish trusted tenant context before resource authorization.

## Rules

- Tenant identifiers are not trusted merely because they appear in request payloads.
- Membership determines whether a subject may operate within an organization/tenant.
- Resource ownership and tenant scope are checked independently where required.
- Cross-tenant operations require explicit policy authorization and auditability.
- Caches, search indexes, files, events, and observability records must preserve tenant boundaries where tenant-scoped.

## Consequence

Every domain must declare its tenancy model rather than silently inventing one.
