# AFAGHX AI Engineering Command Center

## Purpose

The AI Engineering Command Center (AIECC) is the controlled engineering control plane for AFAGHX. It continuously inventories the mother repository, maps architecture and security boundaries, plans work, executes approved changes on isolated branches, validates evidence, and opens pull requests for human review.

It is an engineering agent system, not an unrestricted autonomous deployer.

## Operating loop

```text
Observe -> Inventory -> Assess -> Plan -> Approve -> Implement -> Validate -> Evidence -> PR -> Human Review -> Merge -> Re-observe
```

Every execution must leave an auditable trail in GitHub.

## Command modes

### PLAN

Read-only analysis. Produces an execution plan, risk assessment, affected components, tests, and required evidence. No repository mutation.

### EXECUTE

Implements only the approved scope on a non-main branch. It may create or update files, tests, ADRs, and documentation. It must not push directly to `main`.

### VERIFY

Runs the repository's quality/security gates and compares the resulting evidence with the task acceptance criteria. A failed or missing gate blocks completion.

### AUDIT

Produces a structural and governance report without changing source code.

## Authority boundaries

The Command Center may automate engineering work, but it does not become the security authority of AFAGHX. AFX-CORE remains the sole authority for identity, authentication, authorization, tenant context, membership, policy, audit, consent, trust, configuration, feature flags, and module registration.

The agent must obey `AGENTS.md` and `.ai/command-center.yaml` before making any change.

## GitHub control model

- `main` is the protected integration branch.
- Work is performed in an isolated branch.
- Changes are submitted as a pull request.
- CI/security evidence is required before merge.
- Human review remains the final merge authority.
- Production deployment is a separate approval boundary.

## Required capabilities

1. Repository inventory and dependency graphing.
2. Architecture-boundary verification.
3. Security and secret detection.
4. Test and contract execution.
5. Evidence collection and immutable run metadata.
6. Task planning and implementation.
7. Pull-request creation and review support.
8. Regression detection against the previous known-good baseline.
9. ADR generation for irreversible architectural decisions.
10. Safe stop and escalation when policy violations are detected.

## Credential model

No personal access token, private key, password, production secret, or model credential is stored in source control. The runtime should use a least-privilege GitHub App or equivalent short-lived GitHub credentials and a separately managed model/API credential. Repository write access is limited to the working branch/PR workflow wherever the hosting environment permits it.

## First activation

The first activation should be performed in `PLAN` mode against `main`. Once the inventory and baseline are accepted, `EXECUTE` may be enabled through an explicit workflow input and repository/environment approval.
