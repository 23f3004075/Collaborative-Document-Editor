import type { DbClient, DbQueryResult, DbRow, DbValue } from "./dbTypes";

type HranaArg =
  | { type: "null" }
  | { type: "integer"; value: string }
  | { type: "float"; value: number }
  | { type: "text"; value: string }
  | { type: "blob"; base64: string };

interface HranaCell {
  type: "null" | "integer" | "float" | "text" | "blob";
  value?: string | number | null;
  base64?: string;
}

interface HranaResultEntry {
  type: "ok" | "error";
  error?: { message?: string };
  response?: {
    type: string;
    result?: {
      cols: Array<{ name: string }>;
      rows: HranaCell[][];
    };
  };
}

export function normalizeTursoHttpUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  if (trimmed.startsWith("libsql://")) {
    return `https://${trimmed.slice("libsql://".length)}`;
  }
  return trimmed;
}

export function encodeTursoArg(value: DbValue): HranaArg {
  if (value === null) {
    return { type: "null" };
  }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { type: "integer", value: String(value) }
      : { type: "float", value };
  }
  if (value instanceof Uint8Array) {
    return { type: "blob", base64: Buffer.from(value).toString("base64") };
  }
  return { type: "text", value };
}

export function decodeTursoCell(cell: HranaCell): DbValue {
  if (cell.type === "null") return null;
  if (cell.type === "integer") return Number(cell.value);
  if (cell.type === "float") return Number(cell.value);
  if (cell.type === "blob" && typeof cell.base64 === "string") {
    return new Uint8Array(Buffer.from(cell.base64, "base64"));
  }
  return cell.value !== undefined && cell.value !== null ? String(cell.value) : null;
}

export function splitSqlStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

async function sendPipelineRequest(
  endpoint: string,
  authToken: string | undefined,
  requests: Array<Record<string, unknown>>
): Promise<HranaResultEntry[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ requests }),
    cache: "no-store",
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Turso HTTP ${response.status}: ${bodyText}`);
  }

  const payload = (await response.json()) as { results: HranaResultEntry[] };
  return payload.results;
}

function mapHranaRows(entry: HranaResultEntry): DbQueryResult {
  if (entry.type === "error") {
    throw new Error(entry.error?.message ?? "Turso query execution failed");
  }
  const result = entry.response?.result;
  if (!result) {
    return { rows: [] };
  }

  const rows: DbRow[] = result.rows.map((cells) => {
    const row: DbRow = {};
    result.cols.forEach((col, index) => {
      row[col.name] = decodeTursoCell(cells[index]);
    });
    return row;
  });
  return { rows };
}

export function createTursoHttpClient(
  rawUrl: string,
  authToken?: string
): DbClient {
  const endpoint = `${normalizeTursoHttpUrl(rawUrl)}/v2/pipeline`;

  return {
    async execute(input) {
      const sql = typeof input === "string" ? input : input.sql;
      const args = (typeof input === "string" ? [] : input.args ?? []).map(
        encodeTursoArg
      );
      const results = await sendPipelineRequest(endpoint, authToken, [
        { type: "execute", stmt: { sql, args } },
        { type: "close" },
      ]);
      return mapHranaRows(results[0]);
    },

    async executeMultiple(sql: string) {
      const statements = splitSqlStatements(sql);
      if (statements.length === 0) return;
      const requests: Array<Record<string, unknown>> = statements.map(
        (stmtSql) => ({ type: "execute", stmt: { sql: stmtSql } })
      );
      requests.push({ type: "close" });

      const results = await sendPipelineRequest(endpoint, authToken, requests);
      for (const entry of results) {
        if (entry.type === "error") {
          throw new Error(entry.error?.message ?? "Turso batch statement failed");
        }
      }
    },
  };
}

