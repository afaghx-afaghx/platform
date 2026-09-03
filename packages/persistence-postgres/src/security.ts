import type { Sql, TransactionSql } from 'postgres';

export type DbExecutor = Sql | TransactionSql;

/** Execute a callback against one PostgreSQL transaction. */
export async function inTransaction<T>(db: Sql, work: (tx: TransactionSql) => Promise<T>): Promise<T> {
  return db.begin(async (tx) => work(tx));
}

/** Runtime guard for infrastructure configuration; secrets are supplied at deployment time. */
export function requireDatabaseUrl(value: string | undefined): string {
  if (!value) throw new Error('DATABASE_URL_REQUIRED');
  return value;
}
