# ADR-004 — AFAGHX AI Engineering Provider Boundary

Status: PROPOSED
Date: 2026-10-05

## Decision

The AFAGHX engineering control plane designates GPT-5.6 as the direct engineering reasoning provider. Provider credentials remain external to the repository. The control plane remains provider-adapter based so the repository does not contain secrets or vendor SDK state.

## Authority

This decision changes provider routing only. It does not change AFX-CORE, tenant isolation, request flow, domain ownership, persistence ownership, or production authority.

## Safety

The provider has no authority to merge main, deploy production, read raw secrets, override AGENTS.md, or self-approve evidence. A real provider failure is recorded as failure/unknown rather than simulated success.

## Acceptance

The decision is accepted only after the real GPT-5.6 runtime completes a governed golden execution and CI verifies the resulting evidence.
