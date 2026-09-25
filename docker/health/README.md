# Runtime Health

Every infrastructure dependency must expose a meaningful readiness/health check before being used as a required dependency.

Current Compose health checks:

- PostgreSQL: pg_isready
- Redis: redis-cli ping
- MinIO: mc ready local
- Search: /health
- Redpanda: rpk cluster health

A passing container health check proves dependency readiness only; it does not prove the AFAGHX application runtime or end-to-end request path.
