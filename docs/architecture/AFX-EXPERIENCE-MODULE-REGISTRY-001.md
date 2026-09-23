# AFX-EXPERIENCE 17-Module Registry

## Canonical status

This document defines the AFAGHX Experience entrypoint registry as **17 controlled entries**:

- 1 main ecosystem entrypoint
- 16 role/specialized module entrypoints

It does **not** redefine the DOMAIN bounded-context registry. Experience entrypoints are application/presentation boundaries and must use the canonical platform/domain APIs.

## Security and architecture

Every entrypoint uses AFX-CORE as the authority for identity, authentication, authorization, tenant context, membership, policy, audit, consent and trust primitives.

Canonical request flow:

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State`

Canonical dependency direction:

`EXPERIENCE → PLATFORM / DOMAIN → CORE`

Direct Experience-to-database access is forbidden.

## Runtime baseline

The existing executable web reference uses **Node.js >=20** under `experience/web`.

Validation:

`cd experience/web && npm run test:module-registry`

## Registry source of truth

The machine-readable source of truth is:

`experience/module-registry.json`

The 17 entrypoint manifests live under:

`experience/modules/`

## Entries

| # | ID | Name | Host |
|---:|---|---|---|
| 0 | AFX-00 | AFAGHX Main Ecosystem | www.afaghx.com |
| 1 | AFX-MOD-EXEC-001 | Executive | executive.afaghx.com |
| 2 | AFX-MOD-ADMIN-001 | Administration | admin.afaghx.com |
| 3 | AFX-MOD-SELL-001 | Sellers | sell.afaghx.com |
| 4 | AFX-MOD-BUY-001 | Buyers | buyer.afaghx.com |
| 5 | AFX-MOD-AFF-001 | Affiliate | affiliate.afaghx.com |
| 6 | AFX-MOD-FIN-001 | Finance | finance.afaghx.com |
| 7 | AFX-MOD-INV-001 | Inventory | inventory.afaghx.com |
| 8 | AFX-MOD-LOG-001 | Logistics | logistics.afaghx.com |
| 9 | AFX-MOD-MKT-001 | Marketing | marketing.afaghx.com |
| 10 | AFX-MOD-ADS-001 | Advertising | ads.afaghx.com |
| 11 | AFX-MOD-SEO-001 | SEO | seo.afaghx.com |
| 12 | AFX-MOD-SUP-001 | Suppliers | supplier.afaghx.com |
| 13 | AFX-MOD-FAC-001 | Factories | factory.afaghx.com |
| 14 | AFX-MOD-SVC-001 | Services | service.afaghx.com |
| 15 | AFX-MOD-TRUST-001 | Trust | trust.afaghx.com |
| 16 | AFX-MOD-SUPP-001 | Support | support.afaghx.com |

## Governance

This registry is introduced on a controlled branch and must be reviewed through a Pull Request before it is considered part of `main`. No claim of production readiness is made by the registry alone; implementation, CI evidence and deployment verification remain separate gates.
