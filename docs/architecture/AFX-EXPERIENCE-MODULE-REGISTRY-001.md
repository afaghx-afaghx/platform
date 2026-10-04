# AFX-EXPERIENCE Entrypoint Registry v2

## Canonical topology

AFAGHX has **18 top-level ecosystem entrypoints**:

- **1 main ecosystem site:** `www.afaghx.com`
- **17 module entrypoints:** 16 role/specialized Experience applications + the shared `api.afaghx.com` platform/API spine

The API spine is explicitly represented in this registry, but it is not a business DOMAIN and does not create an independent security authority.

## Entrypoints

| # | ID | Name | Host | Classification |
|---:|---|---|---|---|
| 0 | AFX-00 | Main Ecosystem | `www.afaghx.com` | main-site |
| 1 | AFX-MOD-EXEC-001 | Executive | `executive.afaghx.com` | role-module |
| 2 | AFX-MOD-ADMIN-001 | Administration | `admin.afaghx.com` | role-module |
| 3 | AFX-MOD-SELL-001 | Sellers | `sell.afaghx.com` | role-module |
| 4 | AFX-MOD-BUY-001 | Buyers | `buyer.afaghx.com` | role-module |
| 5 | AFX-MOD-AFF-001 | Affiliate | `affiliate.afaghx.com` | role-module |
| 6 | AFX-MOD-FIN-001 | Finance | `finance.afaghx.com` | role-module |
| 7 | AFX-MOD-INV-001 | Inventory | `inventory.afaghx.com` | role-module |
| 8 | AFX-MOD-LOG-001 | Logistics | `logistics.afaghx.com` | role-module |
| 9 | AFX-MOD-MKT-001 | Marketing | `marketing.afaghx.com` | role-module |
| 10 | AFX-MOD-ADS-001 | Advertising | `ads.afaghx.com` | role-module |
| 11 | AFX-MOD-SEO-001 | SEO | `seo.afaghx.com` | role-module |
| 12 | AFX-MOD-SUP-001 | Suppliers | `supplier.afaghx.com` | role-module |
| 13 | AFX-MOD-FAC-001 | Factories | `factory.afaghx.com` | role-module |
| 14 | AFX-MOD-SVC-001 | Services | `services.afaghx.com` | role-module |
| 15 | AFX-MOD-TRUST-001 | Trust | `trust.afaghx.com` | role-module |
| 16 | AFX-MOD-SUPP-001 | Support | `support.afaghx.com` | role-module |
| 17 | AFX-MOD-API-001 | API Spine | `api.afaghx.com` | platform-spine |

## Architecture authority

All protected requests follow:

`Authentication → Identity → Tenant Context → Membership → RBAC/Permission → Policy → Resource State`

Dependency direction:

`EXPERIENCE → PLATFORM / DOMAIN → CORE`

AFX-CORE remains the sole security/trust authority. Experience does not access PostgreSQL directly.

## Important distinction

`.ai/architecture/module-map.yaml` defines the **internal 18-module architecture program**.

`experience/module-registry.json` defines **public/application entrypoints**.

These are separate registries and must not be conflated:

`Internal architecture modules ≠ public Experience entrypoints`

## Runtime and completion

Registry declaration is not runtime evidence. A module is complete only when implementation, API/event contracts, authorization, tenant rules, tests, observability, CI, deployment and runtime evidence satisfy the applicable gate.

## Canonical migration rule

New references MUST use `services.afaghx.com`. References to `service.afaghx.com` are legacy and require explicit migration tracking.
