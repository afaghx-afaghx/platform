# AFAGHX Docker Runtime Contract

## Findings
| Component | Runtime verified | Entrypoint | Build | Run | Port | Decision |
|---|---|---|---|---|---|---|
| AFX-CORE | No | None | None | None | None | No Dockerfile |
| AFX-PLATFORM Gateway | No standalone server | platform/Gateway/runtime.mjs exports createCanonicalRuntime(), but does not call listen() | None | None | None declared | No Dockerfile |
| Experience Web | Yes | experience/web/server.js | No build step | node server.js | 3000 by default | Dockerfile created |

## AFX-CORE evidence
- core/AFX-CORE/package.json: Node >=22 and test scripts only; there is no start or server script.
- core/AFX-CORE/src/index.js: exports the Core implementation; it is a library surface.
- core/AFX-CORE/src/persistent-core.js: provides persistent Core operations and migration, but does not expose an HTTP listener.
- core/AFX-CORE/src/repository.js: provides the PostgreSQL repository implementation, not a server.
- Decision: no Core Dockerfile. A server wrapper would fabricate a runtime.

## AFX-PLATFORM Gateway evidence
- platform/Gateway/runtime.mjs: imports Node HTTP and exposes createCanonicalRuntime() and createServer().
- It returns http.createServer(handle), but contains no top-level server.listen(...) invocation and no package manifest/start command was found under platform/Gateway/.
- platform/Gateway/runtime.integration.test.mjs starts the server explicitly from a test with server.listen(0, ...); that is test orchestration, not a production entrypoint.
- Decision: no Platform Dockerfile. A Docker entrypoint would invent process startup semantics.

## Experience Web evidence
- experience/web/package.json: start is node server.js and Node >=20.
- experience/web/server.js: creates the HTTP server and calls listen using PORT (default 3000) and HOST (default 127.0.0.1).
- Docker sets HOST=0.0.0.0.
- Health contract: HTTP GET / must return a successful response using the existing static-file behavior.

## Environment
Experience Web uses PORT and HOST only. No database, Redis, object-storage, or search dependency is declared by its package manifest. The server CSP permits the canonical API origin https://api.afaghx.com.

## Architecture decision
Docker Foundation packages PostgreSQL 16 + pgvector, Redis 7, MinIO, Meilisearch, and Experience Web. Core and Platform remain source/runtime components until repository-native runnable service contracts exist.

Static Compose/Dockerfile validation is not runtime proof. Full build/start/health evidence requires a Docker-capable controlled run or CI.
