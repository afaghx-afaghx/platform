# INFRA

Infrastructure is reproducible, environment-separated and secret-free in source control.

Required production layers:
- container/runtime definitions
- PostgreSQL and Redis
- message broker adapter
- object storage
- secrets manager / KMS-HSM boundary
- observability collector and storage
- CI/CD and deployment policy
- backup/restore and disaster recovery automation

Production credentials, private keys and environment-specific secrets must never be committed.
