# Security Policy

## Reporting
Do not disclose unpatched vulnerabilities in public issues. Report security-sensitive findings privately to the repository maintainers through the project's configured private GitHub security-reporting mechanism.

## Scope
Security reports should include:
- affected commit, branch, or file path;
- reproducible steps;
- impact and affected boundary;
- evidence;
- suggested remediation when available.

## Security baseline
AFAGHX requires deny-by-default authorization, tenant isolation, short-lived access tokens, refresh-token rotation, persisted token digests, and an explicit secrets/KMS boundary. Secrets must never enter source control.

## Disclosure
Do not publish exploit details until maintainers have assessed the issue and an appropriate remediation/disclosure plan exists.
