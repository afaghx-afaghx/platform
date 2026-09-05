# AFAGHX System Context

## System boundary

AFAGHX is a multi-tenant ecosystem platform. External actors and systems interact through governed experience and API boundaries.

```text
Users / Partners / Administrators / External Systems
                    |
                    v
             EXPERIENCE / API
                    |
                    v
                 GATEWAY
                    |
                    v
              AFX-CORE TRUST
                    |
       +------------+------------+
       |            |            |
    DOMAIN       PLATFORM    INTELLIGENCE
       |            |            |
       +------------+------------+
                    |
             Owned Persistence
                    |
             Infrastructure
```

## Trust boundary

No component below the Gateway may treat authentication, tenant, membership, role, or policy information as trusted merely because it arrived in a request. Trust is established by AFX-CORE and propagated through explicit security context.

## Tenant isolation

Tenant isolation applies to request authorization and, where relevant, database queries, cache keys, message routing, search indexes, files, logs, traces, and analytics. A tenant identifier is a security boundary, not a convenience field.

## Failure posture

Security failures fail closed. Unknown identity, missing tenant context, inactive membership, expired/revoked sessions, invalid permissions, policy uncertainty, and integrity failures must not silently degrade into access.

## Operational posture

Production changes require automated validation, evidence collection, and explicit approval. Security evidence must be reproducible from CI rather than asserted manually.
