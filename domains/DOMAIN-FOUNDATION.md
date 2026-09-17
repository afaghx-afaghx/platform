# AFAGHX Domain Foundation

**Spec:** AFX-DOMAIN-FOUNDATION-001 v1.0  
**Status:** Foundation baseline complete  
**Authority:** `domains/domain-registry.json`

## 1. Canonical bounded contexts

AFAGHX business domains are independently bounded contexts:

1. Product
2. Commerce
3. Order
4. Factory
5. Supplier
6. Service
7. Partner
8. Marketing
9. Advertising
10. Logistics
11. Payment

Each context owns its business rules, application behavior, entities, and persistence boundary. The registry is the canonical inventory; a domain must not be silently introduced outside it.

## 2. Ownership rules

- Every business entity has exactly one domain owner.
- AFX-CORE owns identity, authorization, organization, membership, policy, audit, and trust foundation concerns only.
- AFX-CORE does not own Product, Commerce, Order, Payment, Factory, Supplier, Service, Partner, Marketing, Advertising, or Logistics entities.
- Cross-domain database/table access is forbidden.
- Shared database primitives do not create shared domain ownership.

## 3. Integration rules

Cross-domain collaboration must use one of the following explicit mechanisms:

- versioned API/application contract;
- versioned domain event;
- explicit application interface owned by the receiving context.

A domain must never reach into another domain's repository, migration, table, or private module.

## 4. Production rule

This document closes the **domain foundation** gate only. It does **not** claim that all eleven business domains are feature-complete or production-ready. Feature completion requires executable domain behavior, persistence, API contracts, authorization, tests, observability, migration safety, and production evidence for each context.

## 5. Required closure evidence per domain

For a domain to move from foundation-ready to production-ready, evidence must exist for:

- domain module and ownership;
- API/application contract;
- persistence/migrations;
- authorization policy;
- unit and integration tests;
- cross-domain contract tests where applicable;
- audit/observability requirements;
- failure and retry semantics where applicable;
- CI enforcement;
- deployment/rollback evidence.

No documentation-only declaration can mark a domain production-ready.
