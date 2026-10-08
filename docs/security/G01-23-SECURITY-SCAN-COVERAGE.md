# G01-23 Security Scan Coverage

**Control:** G01-23
**Status:** PARTIAL — CI scan pipeline is implemented; closure still requires complete production scanner coverage and reviewed findings.

## Implemented in this wave

- Dependency advisory scan with npm audit at HIGH severity.
- Secret scanning of the current tree and added PR lines with Gitleaks.
- Historical secret scan as audit-only evidence.
- JavaScript SAST with CodeQL.
- Trivy filesystem scan for vulnerability, secret and IaC misconfiguration at HIGH/CRITICAL severity.

## Not yet closable

The repository has no canonical Dockerfile/image, so a meaningful container-image scan cannot yet be attached to the actual release artifact. There is also no approved deployed DAST target in the repository evidence.

Therefore this wave does NOT mark G01-23 DONE.

## Closure evidence

The security-scans workflow must pass on the protected branch with no unreviewed HIGH/CRITICAL findings and produce reviewable artifacts. Container-image and DAST evidence must be added when their canonical runtime targets exist.
