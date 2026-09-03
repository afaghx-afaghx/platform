declare module 'postgres' {
  export interface TransactionSql {
    <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> & { count: number };
  }
  export interface Sql extends TransactionSql {
    begin<T>(callback: (sql: TransactionSql) => Promise<T>): Promise<T>;
  }
  export function defaultSql(url: string, options?: Record<string, unknown>): Sql;
  export default defaultSql;
}
