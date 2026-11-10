export type DbValue = string | number | null | Uint8Array;
export type DbRow = Record<string, DbValue>;

export interface DbQueryResult {
  rows: DbRow[];
}

export interface DbClient {
  execute(
    input: string | { sql: string; args?: DbValue[] }
  ): Promise<DbQueryResult>;
  executeMultiple(sql: string): Promise<void>;
}

