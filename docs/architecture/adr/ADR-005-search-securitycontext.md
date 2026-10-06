# ADR-005 — Search Integration with Canonical SecurityContext

## Status

Proposed — Step 4 implementation branch.

## Context

AFAGHX Step 1 defines Search as a downstream consumer of the same immutable SecurityContext created and enforced by the Gateway. Search must not implement a parallel authentication path or accept tenant authority from the request.

## Decision

The canonical flow for `GET /v1/search` is:

`Request → Gateway Authentication → RBAC → Core Policy → immutable SecurityContext → Search Route → Meilisearch`

The Search route requires:

- `securityContext` to exist.
- `securityContext.rbac.allowed === true`.
- `securityContext.policy.effect === "allow"`.
- `securityContext.tenant.tenantId` to exist.

The Meilisearch adapter receives the same SecurityContext and derives the mandatory tenant filter only from `securityContext.tenant.tenantId`.

Request-supplied tenant identifiers are not used by Search. They remain subject to the Gateway's existing ignore-and-audit behavior.

Search does not authenticate independently and does not reimplement RBAC or Policy.

## Consequences

This establishes one security spine across Gateway → Core → Search, prevents request-level tenant override, and makes tenant isolation testable at both route and search-adapter boundaries.

The search index must expose a filterable `tenant_id` attribute for tenant-scoped search.

## Evidence target

The Step 4 proof must include:

1. Search request reaches Search only with an authenticated SecurityContext.
2. RBAC denial prevents the search adapter from being called.
3. Policy deny/abstain prevents the search adapter from being called.
4. An allowed request passes the same SecurityContext into Search.
5. Meilisearch query contains the trusted `tenant_id` filter.
6. A live integration query returns only records from the SecurityContext tenant.
7. No Main merge occurs before the AFAGHX Final Gate.
