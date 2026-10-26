# Contributing to AFAGHX Platform

## Before contributing
- Read `AGENTS.md` and the applicable architecture specifications.
- Preserve the seven-layer dependency direction and canonical security flow.
- Do not introduce parallel identity, authentication, authorization, tenant, policy, audit, or trust authorities.
- Never commit secrets, credentials, tokens, private keys, or production configuration.

## Change workflow
1. Open or identify an issue.
2. For structural architecture changes, add an ADR in `docs/architecture/adr/` before implementation.
3. Work on an isolated branch.
4. Add real tests appropriate to the change.
5. Run local validation.
6. Open a pull request using the repository template.
7. CI, security gates, evidence, and human review are required before merge.

## Pull requests
PRs must state scope, affected layers, tests, security implications, migration impact, and evidence. Do not claim GREEN without CI evidence.

## Scope
Keep changes narrow and preserve explicit ownership. Cross-domain persistence access and Experience-to-database access are prohibited.
