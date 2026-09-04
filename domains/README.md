# DOMAIN

Business capabilities live in explicit bounded contexts.

Every domain owns its aggregates, persistence model, commands, queries and domain events. Domains may call AFX-PLATFORM capabilities and AFX-CORE authorization contracts, but may not create a second identity/security authority or access another domain's tables directly.

Each domain specification must define:
1. bounded-context responsibility
2. aggregates and invariants
3. commands/queries
4. events and API contracts
5. tenant semantics
6. authorization policies
7. consistency/failure model
8. ownership and operational SLOs
