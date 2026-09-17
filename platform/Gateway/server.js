import { Pool } from 'pg';
import { PostgresAfxCoreRepository } from '../../core/AFX-CORE/src/repository.js';
import { PersistentAfxCore } from '../../core/AFX-CORE/src/persistent-core.js';
import { createCanonicalRuntime } from './runtime.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const repository = new PostgresAfxCoreRepository(pool);
const core = new PersistentAfxCore({ repository });

let searchProvider;
if (process.env.SEARCH_PROVIDER_MODULE) {
  const module = await import(process.env.SEARCH_PROVIDER_MODULE);
  searchProvider = module.default ?? module.searchProvider;
}
if (!searchProvider) {
  searchProvider = { search: async () => { throw new Error('search_provider_not_configured'); } };
}

const runtime = createCanonicalRuntime({
  core,
  searchProvider,
  security: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean),
  },
});

await runtime.listen();
