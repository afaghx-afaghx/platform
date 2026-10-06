# @afaghx/shared-kernel

Minimal, domain-neutral primitives shared across AFAGHX layers.

This package contains no business workflow, persistence, authentication, authorization or tenant decision logic.

Current primitive:
- Brand type for preventing accidental cross-entity assignment at compile time.

Consumers must remain acyclic and domain-neutral.
