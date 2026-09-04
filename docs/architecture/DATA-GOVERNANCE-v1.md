# AFAGHX Data Governance v1

## Ownership

Each bounded context owns its transactional data. Other contexts consume an explicit API or event contract and MUST NOT query another context's tables directly.

## Isolation

Tenant-scoped data carries an authoritative tenant boundary. Queries, writes, cache keys, search documents, files, asynchronous messages and analytics exports MUST preserve tenant scope.

## Classification

Data is classified at minimum as Public, Internal, Confidential and Restricted. Credentials, authentication secrets and private keys are Restricted and are never persisted in application logs or event payloads.

## Consistency

- A domain transaction is the atomic boundary for its own state.
- Cross-domain workflows use events/sagas rather than distributed database transactions unless an explicit ADR approves otherwise.
- Outbox/inbox patterns are required where durable state change and event publication must be atomic.
- Consumers must be idempotent.

## Retention

Retention is policy-driven by data class, legal/business requirement and tenant configuration. Deletion must be auditable and must not violate required legal holds.

## Analytics

Operational databases are not the analytics contract. Analytics consumes governed events/read models/data products and applies access controls and tenant filtering.
