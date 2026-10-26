# Test Tooling

Shared deterministic setup, fixtures, helpers, and mocks. Tooling is deliberately domain-neutral and must not become a second application authority.

Database/cache mocks model boundary behavior only. They are not substitutes for integration evidence against real PostgreSQL/Redis when those services are required.
