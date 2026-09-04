# AFAGHX Production Readiness Gates v1

A release cannot be considered production-ready unless all applicable gates pass.

## Security

- Authentication lifecycle tests pass.
- JWT issuer, audience, algorithm and expiry validation are tested.
- Refresh rotation and replay/family revocation are tested, including concurrency.
- Session revocation is enforced on protected requests.
- Tenant breakout/IDOR tests pass.
- Authorization is default-deny and policy-declared.
- Secrets and private keys are absent from repository history and build artifacts.
- Dependency, secret, container and IaC scanning pass.

## Quality

- TypeScript build passes.
- Lint and formatting pass.
- Unit, integration, contract and E2E suites pass for changed capabilities.
- Database migrations are forward-safe and reviewed.
- API/event contracts are versioned.

## Operations

- Structured logs, metrics and traces are available.
- Health/readiness checks exist.
- SLI/SLO and alert thresholds are documented.
- Backups are verified and restore tests are performed.
- RPO/RTO are defined for production services.
- Incident response and rollback procedures are documented.

## Data

- Domain ownership is explicit.
- Tenant isolation is tested across all persistence/projection boundaries.
- Retention and deletion policies are defined for the data class involved.
- Analytics access is separated from operational write paths.
