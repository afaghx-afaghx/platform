export { PersistentAfxCore } from './persistent-core.js';
export { AfxCoreRepository, PostgresAfxCoreRepository, AFX_CORE_SCHEMA } from './repository.js';
export { hashPassword, verifyPassword, normalizeEmail, randomToken, tokenDigest, SECURITY_PARAMETERS } from './security.js';

// The in-memory AfxCore implementation remains test/fixture-only and is intentionally
// excluded from the public runtime entrypoint to prevent accidental production wiring.
