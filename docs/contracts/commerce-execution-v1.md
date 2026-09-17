# AFAGHX Commerce Execution V1 — CE-01

## Product + Offer Canonical Contract

Status: **DRAFT FOR IMPLEMENTATION**  
Version: `CE-01 v1.0`  
Scope: Product identity, catalog semantics, Offer ownership and boundaries.

## 1. Objective

CE-01 establishes the canonical model that all later Commerce capabilities MUST consume:

`Product → Offer → Inventory → Cart → Checkout → Order → Fulfillment`

Product and Offer are deliberately separate entities. A Product describes **what** exists in the catalog. An Offer describes **how an organization makes that Product commercially available**.

## 2. Entity Ownership

| Entity | Canonical Owner | Responsibility | Forbidden |
|---|---|---|---|
| Product | Product Domain | identity, catalog attributes, taxonomy, lifecycle | price, stock, payment |
| ProductVariant | Product Domain | variant identity and attributes | order state |
| ProductMedia | Product Domain | product media metadata | offer price |
| Offer | Commerce/Product Offer boundary | commercial availability of a Product by an Organization | owning Product identity |
| OfferPrice | Offer owner | price/currency/price rules | inventory ownership |
| Organization | AFX-CORE | legal/business identity | product catalog semantics |
| Membership | AFX-CORE | user-to-organization relationship | offer ownership by itself |
| Inventory | Inventory/Commerce Domain | stock and reservation state | product identity |
| Order | Order Domain | transaction lifecycle | catalog ownership |

## 3. Canonical Relationships

```text
Organization
    │
    └── owns / publishes ──> Offer
                              │
                              └── references ──> Product
                                                   │
                                                   └── has ──> ProductVariant
```

Rules:

1. A Product MUST NOT contain seller-specific price, stock, payment or order state.
2. An Offer MUST reference exactly one canonical Product.
3. An Offer MUST have an owning Organization.
4. A user MUST NOT become the owner of an Offer merely by having a Membership; authorization MUST resolve through AFX-CORE Identity + Tenant/Organization Context + Membership + Role + Permission + Policy.
5. Inventory MUST reference an Offer or explicitly versioned sellable unit; inventory MUST NOT redefine Product identity.
6. Order lines MUST snapshot the commercial identity required for historical correctness; later Product/Offer edits MUST NOT rewrite completed order history.
7. Payment MUST never own Product or Offer records.
8. Experience clients MUST consume these concepts through the canonical API only.

## 4. Product Contract

Minimum canonical fields:

- `id`
- `organization_id` when the Product is organization-owned
- `sku` or canonical product code where applicable
- `name`
- `slug`
- `description`
- `basket_id` from the approved taxonomy
- `status`
- `attributes`
- `created_at`
- `updated_at`
- `version`

Product identity is stable. Descriptive content may evolve through versioned changes.

## 5. Offer Contract

Minimum canonical fields:

- `id`
- `product_id`
- `organization_id`
- `status`
- `currency`
- `price` or a reference to an explicit price model
- `minimum_order_quantity` where applicable
- `lead_time` where applicable
- `availability_policy`
- `trade_terms` where applicable
- `valid_from`
- `valid_until` where applicable
- `created_at`
- `updated_at`
- `version`

An Offer is **not** a second Product record and MUST NOT duplicate canonical Product identity fields as authoritative data.

## 6. B2C + B2B

The same Product may have multiple Offers:

```text
Product P
├── Offer A — B2C
├── Offer B — B2B / MOQ 100
├── Offer C — Factory-direct
└── Offer D — International trade
```

This allows AFAGHX to support consumer commerce, procurement and global trade without forcing three separate product catalogs.

## 7. State Rules

Product lifecycle and Offer lifecycle are independent.

Example:

```text
Product = ACTIVE
Offer A = PAUSED
Offer B = ACTIVE
```

The Product remains discoverable even when one Offer is unavailable. Commerce availability MUST be resolved from active Offers and downstream inventory/fulfillment constraints.

## 8. Anti-Amazon-Copy Rule

AFAGHX may use mature commerce concepts as references, but CE-01 MUST preserve AFAGHX's ecosystem model:

- one Product can connect to many Organizations;
- Organizations can represent suppliers, factories or other business actors;
- Offers can carry B2C, B2B and trade-specific commercial terms;
- procurement/RFQ may create commercial intent without forcing an immediate retail checkout;
- trust and authorization remain cross-cutting platform/core concerns.

## 9. Forbidden Dependencies

The following are architectural failures:

- Experience → PostgreSQL
- Experience → Product repository
- Experience → Offer repository
- Product Domain → Order database writes
- Offer → Payment database writes
- Order → direct Product database mutation
- Inventory → direct Product database mutation
- one domain reading another domain's private tables
- creating a second in-memory Product/Offer authority inside Experience

## 10. CE-01 Acceptance Gate

CE-01 is **GREEN only when evidence proves all of the following**:

1. Product and Offer have unique canonical owners.
2. Product and Offer contracts are machine-testable.
3. Offer references Product without becoming Product's owner.
4. Organization ownership and AFX-CORE authorization are enforced.
5. No cross-domain private DB writes exist.
6. Product/Offer persistence survives process restart.
7. API responses expose the canonical model.
8. Invalid ownership/authorization requests return the appropriate denial response.
9. Tests run in CI.
10. Evidence is attached to the closure matrix.

Until these conditions are proven, CE-01 remains `🟡 IN PROGRESS`.
