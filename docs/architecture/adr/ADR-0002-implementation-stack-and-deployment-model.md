# ADR-0002 — Implementation Stack and Deployment Model

- **Status:** Accepted
- **Date:** 2026-09-04
- **Scope:** AFAGHX platform bootstrap

## Decision

AFAGHX will begin as a **modular monolith with hard architectural boundaries**, backed by PostgreSQL, Redis, and an asynchronous event bus abstraction. The codebase will be structured so bounded contexts can later be extracted into independently deployable services without rewriting domain contracts.

### Baseline technology

- **Application:** TypeScript + NestJS
- **Database:** PostgreSQL
- **Cache / ephemeral coordination:** Redis
- **API contract:** OpenAPI
- **Validation:** strict runtime DTO/schema validation at trust boundaries
- **Testing:** unit, integration, contract, and end-to-end tests
- **Observability:** OpenTelemetry-compatible tracing/metrics/log correlation
- **Containers:** Docker
- **CI:** GitHub Actions

## Why modular monolith first

Microservices are a deployment topology, not a substitute for boundaries. AFAGHX needs strong ownership, contracts, tenant isolation, and security semantics before distributed deployment adds value. The initial topology therefore minimizes operational complexity while preserving extraction seams.

No module may bypass another module's public contract by importing private implementation details or directly manipulating another bounded context's persistence model.

## Security consequences

AFX-CORE remains the single trust foundation. Authentication, identity, authorization, tenant context, membership, policy, audit, and trust primitives are centralized behind explicit interfaces. Business domains consume security context and authorization contracts; they do not implement competing credential or session stores.

## Deployment evolution

A module may become a separately deployed service only when measurable drivers justify extraction, such as independent scaling, fault isolation, compliance boundary, team ownership, or materially different availability requirements. Extraction must preserve public contracts and security invariants.

## Rejected alternatives

- **Immediate microservice-per-module:** rejected because it creates distributed-system complexity before boundaries and contracts are proven.
- **Single undifferentiated application:** rejected because it permits architectural erosion and makes later extraction expensive.
- **Vendor-managed identity as the business trust authority:** rejected as the sole architectural authority; external identity providers may be integrations, while AFX-CORE owns the platform's canonical security context and authorization semantics.
