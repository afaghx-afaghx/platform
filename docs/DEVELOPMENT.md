# Development

## Engineering rules
- Follow `AGENTS.md`.
- Keep changes isolated and reviewable.
- Add an ADR before structural architecture changes.
- Add real tests for changed behavior.
- Treat CI and security evidence as completion gates.

## Local services
Docker assets are documented under `docker/`. Do not assume a service is executable unless a runtime contract and start path exist.

## Dependency management
Use the repository's actual package/workspace configuration. Do not create fake workspace dependencies or placeholder runtime contracts.
