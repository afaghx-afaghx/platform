# AFAGHX Dependency Rules

## Allowed direction

```text
Experience -> Domain -> Platform -> Core
Experience -> Platform -> Core
Intelligence -> Contracts / Events / Approved APIs
```

## Prohibited dependencies

- Core -> Domain
- Core -> Intelligence
- Core -> Experience
- Domain -> another domain's persistence layer
- Experience -> domain persistence
- Intelligence -> private domain database
- Any module -> authentication implementation outside AFX-CORE
- Any module -> secrets committed to source control

## Rule: API before coupling

Cross-boundary access must use a published contract. Internal implementation details are not contracts.

## Rule: Events are contracts

Events require stable names, versioning, producer ownership, schema validation, correlation metadata, and consumer-safe evolution.

## Rule: shared package discipline

`packages/` is for genuinely reusable technical primitives. Business logic must remain in its owning context.

## Rule: data ownership

A service may read another context only through an approved read API, event projection, or governed data product. It may never mutate another context's database directly.

## Rule: security cannot be bypassed

Every protected boundary carries tenant and authorization context. Internal networking does not imply trust.
