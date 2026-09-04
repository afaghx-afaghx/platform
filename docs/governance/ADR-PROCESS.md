# AFAGHX Architecture Decision Record (ADR) Process

## Purpose

ADRs preserve durable architecture decisions and prevent undocumented drift across the AFAGHX Ecosystem Platform.

## When an ADR is mandatory

Create an ADR before implementation when a change:

- changes a non-negotiable architecture boundary;
- changes identity, authentication, authorization, tenant isolation, trust, audit, or security architecture;
- introduces or removes a service or bounded context;
- changes an API/event contract or compatibility policy;
- changes persistence ownership or data lifecycle;
- introduces a new infrastructure dependency or trust boundary;
- changes deployment, cryptographic key management, workload identity, or release security policy.

## Lifecycle

1. Create a numbered ADR under `docs/architecture/adr/`.
2. Set status to `Proposed`.
3. Describe context, decision, alternatives, consequences, security impact, migration/rollback, and validation plan.
4. Review through the normal pull-request process.
5. Mark `Accepted` only after the required architectural/security review.
6. Supersede rather than rewrite an accepted decision when the decision materially changes.

## Naming

`NNNN-short-kebab-case-title.md`

Example: `0001-centralize-authentication-in-afx-core.md`

## Required template

```markdown
# ADR NNNN — Title

- Status: Proposed | Accepted | Superseded | Rejected
- Date: YYYY-MM-DD
- Owners: @owner

## Context

## Decision

## Alternatives considered

## Consequences

## Security and threat-model impact

## Migration and rollback

## Validation / evidence
```

## Governance rule

An implementation that materially conflicts with an accepted ADR requires either a new ADR that supersedes it or an explicit amendment through review. ADRs do not replace tests, CI, security review, or operational evidence.
