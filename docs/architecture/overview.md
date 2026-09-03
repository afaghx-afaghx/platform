# AFAGHX Mother Architecture

## Purpose
This document defines the stable architectural boundary of the AFAGHX ecosystem. It is the reference point for implementation, review, security, and future repository decomposition.

## Layers

### AFX-CORE
Owns trust primitives and cross-cutting identity capabilities:
- identity
- authentication
- authorization
- organizations
- memberships
- tenant-context
- RBAC
- policy
- audit
- consent
- trust
- configuration
- feature-flags
- module-registry

CORE owns security context; it does not own business workflows.

### AFX-PLATFORM
Provides reusable infrastructure-facing capabilities: API gateway/management, messaging, notifications, search, files, workflow, billing, observability, and integrations.

### DOMAIN
Each business capability is a bounded context with explicit data ownership, APIs, events, policies, and lifecycle. Domains never become dependent on another domain's database.

### INTELLIGENCE
AI and data capabilities consume governed contracts, events, and data products. Intelligence does not become an alternate source of truth for transactional domain state.

### EXPERIENCE
User-facing applications consume governed APIs/BFFs and never implement security policy independently.

## Security context

For a protected operation, the platform establishes:

1. Authentication — establish a valid principal.
2. Identity — resolve the canonical actor.
3. Tenant Context — determine the active organization/tenant.
4. Membership — verify the actor belongs to the tenant.
5. RBAC/Permission — determine allowed capabilities.
6. Policy — evaluate contextual rules.
7. Resource State — enforce resource-level constraints.

The order is conceptual and implementations may combine steps, but no protected business operation may skip the resulting security guarantees.

## Multi-tenancy

Tenant identity is explicit in request context and contracts. Isolation must be preserved across persistence, cache, queues, search indexes, files, logs, metrics, and downstream calls wherever tenant data can exist. Cross-tenant operations require an explicit privileged policy and auditable reason.

## Contracts

APIs, events, and schemas live under `contracts/`. Breaking changes require a versioning decision. Events must carry stable identifiers, timestamps, schema versions, tenant context where applicable, and correlation/causation metadata.

## Repository strategy

The monorepo is the canonical implementation home during bootstrap. A service becomes a separately deployed unit only when its ownership, scaling, security, release cadence, or operational boundary justifies it. Repository fragmentation is never an architectural goal by itself.
