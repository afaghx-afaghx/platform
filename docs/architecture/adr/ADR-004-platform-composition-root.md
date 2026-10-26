# ADR-004 — Platform Composition Root

**Status:** Accepted  
**Scope:** Production Platform / Gateway runtime

## Decision

The Gateway is an enforcement and transport boundary. It must not import or construct Domain persistence/query implementations.

Domain wiring is owned by the Platform composition root at `platform/runtime/composition.mjs`. The composition root injects application capabilities into the Gateway runtime.

Canonical shape:

```text
Platform Composition Root
        |
        +--> Domain adapters / application capabilities
        |
        +--> Gateway (enforcement + transport)
```

The Gateway may consume an injected capability, but must not know how the Domain repository or adapter is constructed.

## Verification

CI must enforce this boundary with a static architecture test and execute the existing runtime smoke tests. A violation is fail-closed.

## Consequence

This preserves the modular-monolith deployment model while preventing the Gateway from becoming a hidden Domain composition root.
