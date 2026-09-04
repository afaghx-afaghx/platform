# Security Policy

## Scope

AFAGHX security issues include authentication, authorization, tenant isolation, session/token handling, cryptography, secrets, infrastructure, dependency/supply-chain risks, and CI/CD security.

## Reporting

Do not disclose exploitable vulnerabilities in public issues or pull requests. Report security findings privately to the repository maintainers through the GitHub security reporting mechanism available for this repository.

Include:
- affected component and version/commit
- reproduction steps or proof of concept
- security impact
- suggested mitigation, if known

## Engineering policy

Security-sensitive changes require tests and CI evidence. Secrets must never be committed. A security control is not considered complete until implementation, test, CI, and evidence-artifact requirements are satisfied.

## Disclosure

Maintain a coordinated disclosure process. Public disclosure should occur only after a fix or mitigation is available and maintainers have assessed the risk.
