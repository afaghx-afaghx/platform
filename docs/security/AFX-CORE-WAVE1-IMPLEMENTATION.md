# AFX-CORE Wave 1 — Implementation Record

## Objective

Close the first dependency layer of Gate 01: durable persistence, transactional refresh rotation, and concurrency evidence.

## Implemented

- `core/AFX-CORE/src/repository.js`
  - PostgreSQL schema for users, memberships, role permissions, sessions, refresh families and refresh tokens.
  - Durable repositories with database constraints and indexed lookup paths.
  - Transactional refresh rotation using row locks and a single database transaction.
- `core/AFX-CORE/src/persistent-core.js`
  - Persistent AFX-CORE authentication service using the repository boundary.
  - Password authentication, tenant membership checks, access-token verification, refresh rotation, session revocation and deny-by-default authorization.
- `core/AFX-CORE/test/persistence.test.js`
  - Persistence across service-object recreation.
  - Concurrent refresh acceptance criterion: exactly one concurrent request wins.

## Acceptance criteria

1. Authentication state survives process restart.
2. User email is unique at the database boundary.
3. Membership is unique per `(user_id, tenant_id)`.
4. Refresh rotation is serialized by database transaction/row locking.
5. A refresh token can produce at most one successful successor.
6. Reuse/replay revokes the refresh family and associated sessions.
7. CI runs the persistence tests against a real PostgreSQL service.

## Current status

**Implementation: IN PROGRESS**

The repository and persistent service are committed. The dependency manifest and CI service activation must be wired before claiming `DONE`. No production Gate status is changed by this document alone.

## Next execution

- Activate PostgreSQL dependency in `core/AFX-CORE/package.json`.
- Add PostgreSQL service to the Gate workflow.
- Run persistence and concurrency tests in CI.
- Capture the run as Gate evidence.
- Only then move G01-10/G01-12 toward `DONE`.

**Domain Freeze remains ON.**
