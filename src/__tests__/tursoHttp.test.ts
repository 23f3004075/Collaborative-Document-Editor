import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTursoHttpClient,
  decodeTursoCell,
  encodeTursoArg,
  normalizeTursoHttpUrl,
  splitSqlStatements,
} from "@/lib/tursoHttp";

describe("Turso HTTP adapter", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("normalizes libsql:// URLs to https:// endpoints", () => {
    expect(normalizeTursoHttpUrl("libsql://ajaia-demo.turso.io/")).toBe(
      "https://ajaia-demo.turso.io"
    );
    expect(normalizeTursoHttpUrl("https://ajaia-demo.turso.io")).toBe(
      "https://ajaia-demo.turso.io"
    );
  });

  it("encodes and decodes primitive Hrana argument and cell types", () => {
    expect(encodeTursoArg(null)).toEqual({ type: "null" });
    expect(encodeTursoArg(42)).toEqual({ type: "integer", value: "42" });
    expect(encodeTursoArg(3.14)).toEqual({ type: "float", value: 3.14 });
    expect(encodeTursoArg("hello")).toEqual({ type: "text", value: "hello" });

    expect(decodeTursoCell({ type: "null" })).toBeNull();
    expect(decodeTursoCell({ type: "integer", value: "7" })).toBe(7);
    expect(decodeTursoCell({ type: "text", value: "abc" })).toBe("abc");
  });

  it("splits multi-statement SQL and executes pipeline queries", async () => {
    const statements = splitSqlStatements(
      "PRAGMA foreign_keys = ON;\nCREATE TABLE t (id TEXT);\n"
    );
    expect(statements).toEqual([
      "PRAGMA foreign_keys = ON",
      "CREATE TABLE t (id TEXT)",
    ]);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              type: "ok",
              response: {
                type: "execute",
                result: {
                  cols: [{ name: "id" }, { name: "file_size" }],
                  rows: [
                    [
                      { type: "text", value: "doc_1" },
                      { type: "integer", value: "1024" },
                    ],
                  ],
                },
              },
            },
            { type: "ok", response: { type: "close" } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = createTursoHttpClient(
      "libsql://ajaia-demo.turso.io",
      "secret-token"
    );
    const res = await client.execute({
      sql: "SELECT id, file_size FROM docs WHERE id = ?",
      args: ["doc_1"],
    });

    expect(res.rows).toEqual([{ id: "doc_1", file_size: 1024 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://ajaia-demo.turso.io/v2/pipeline");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer secret-token"
    );
  });
});

