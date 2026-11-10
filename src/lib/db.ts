import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database, type SqlValue } from "sql.js";
import type { DbClient, DbRow } from "./dbTypes";
import { SEEDED_PERSONAS } from "./personas";
import { createTursoHttpClient } from "./tursoHttp";

export type { DbClient, DbQueryResult, DbRow, DbValue } from "./dbTypes";

let dbInstance: Database | null = null;
let clientInstance: DbClient | null = null;
let initPromise: Promise<void> | null = null;

function isRemoteTursoUrl(url?: string): url is string {
  if (!url) return false;
  return (
    url.startsWith("libsql://") ||
    url.startsWith("https://") ||
    url.startsWith("http://")
  );
}

function resolveDbFilePath(): string | null {
  const configured =
    process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
  if (configured === ":memory:") {
    return null;
  }
  if (configured && configured.startsWith("file:")) {
    return configured.slice("file:".length);
  }
  if (process.env.VERCEL === "1") {
    return "/tmp/ajaia.db";
  }
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, "ajaia.db");
}

function persistDatabase(db: Database, filePath: string | null): void {
  if (!filePath) return;
  const data = db.export();
  fs.writeFileSync(filePath, Buffer.from(data));
}

function isReadOnlyStatement(sql: string): boolean {
  return /^\s*select\b/i.test(sql);
}

function createSqlJsWrapper(db: Database, filePath: string | null): DbClient {
  return {
    async execute(input) {
      const sql = typeof input === "string" ? input : input.sql;
      const args = (typeof input === "string" ? [] : input.args ?? []) as SqlValue[];
      const stmt = db.prepare(sql);
      const rows: DbRow[] = [];
      try {
        if (args.length > 0) {
          stmt.bind(args);
        }
        while (stmt.step()) {
          rows.push(stmt.getAsObject() as DbRow);
        }
      } finally {
        stmt.free();
      }
      if (!isReadOnlyStatement(sql)) {
        persistDatabase(db, filePath);
      }
      return { rows };
    },
    async executeMultiple(sql: string) {
      db.run(sql);
      persistDatabase(db, filePath);
    },
  };
}

async function openDatabase(): Promise<DbClient> {
  if (clientInstance) return clientInstance;

  const remoteUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
  if (isRemoteTursoUrl(remoteUrl)) {
    clientInstance = createTursoHttpClient(
      remoteUrl,
      process.env.TURSO_AUTH_TOKEN
    );
    return clientInstance;
  }

  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
  });
  const filePath = resolveDbFilePath();
  const existingBytes =
    filePath && fs.existsSync(filePath) ? fs.readFileSync(filePath) : undefined;

  dbInstance = new SQL.Database(existingBytes);
  dbInstance.run("PRAGMA foreign_keys = ON;");
  clientInstance = createSqlJsWrapper(dbInstance, filePath);
  return clientInstance;
}

async function createSchema(client: DbClient): Promise<void> {
  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role_title TEXT NOT NULL,
      avatar_color TEXT NOT NULL,
      initials TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content_html TEXT NOT NULL,
      content_json TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS document_shares (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      permission TEXT NOT NULL CHECK (permission IN ('EDIT', 'VIEW')),
      shared_at TEXT NOT NULL,
      UNIQUE (document_id, user_id),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      content_base64 TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
  `);
}

async function seedUsers(client: DbClient): Promise<void> {
  for (const persona of SEEDED_PERSONAS) {
    await client.execute({
      sql: `
        INSERT INTO users (id, name, email, role_title, avatar_color, initials)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          email = excluded.email,
          role_title = excluded.role_title,
          avatar_color = excluded.avatar_color,
          initials = excluded.initials
      `,
      args: [
        persona.id,
        persona.name,
        persona.email,
        persona.roleTitle,
        persona.avatarColor,
        persona.initials,
      ],
    });
  }
}

async function seedStarterDocuments(client: DbClient): Promise<void> {
  const existing = await client.execute("SELECT COUNT(*) as count FROM documents");
  const count = Number(existing.rows[0]?.count ?? 0);
  if (count > 0) return;

  const now = new Date().toISOString();
  const starterDocs = [
    {
      id: "doc_q4_roadmap",
      title: "Q4 Product Architecture & AI Roadmap",
      ownerId: "user_alex",
      html: `<h1>Q4 Product Architecture &amp; AI Roadmap</h1><p>Welcome to <strong>Ajaia Docs</strong>! This document outlines our internal collaboration workflow and architecture priorities for Q4.</p><h2>Core Priorities</h2><ul><li><p><strong>Low-Friction Editing:</strong> Fast rich-text authoring with debounced persistence.</p></li><li><p><strong>Scoped Access Control:</strong> Clear distinction between <em>Owned</em> and <em>Shared</em> documents.</p></li><li><p><strong>File Ingestion:</strong> Import <code>.md</code> or <code>.txt</code> briefs directly into editable drafts.</p></li></ul><blockquote><p>Note: Switch personas in the top-right header to test Editor vs. Viewer permissions immediately.</p></blockquote>`,
    },
    {
      id: "doc_collab_spec",
      title: "Ajaia Internal Collaboration Spec",
      ownerId: "user_sarah",
      html: `<h1>Internal Collaboration Spec</h1><p>This specification is owned by <strong>Sarah Chen</strong> and shared with <strong>Alex Rivera</strong> with <u>Edit</u> access.</p><h2>Meeting Action Items</h2><ol><li><p>Finalize document schema and share permissions API.</p></li><li><p>Verify Markdown and plain text file import edge cases.</p></li><li><p>Review typography and toolbar accessibility.</p></li></ol>`,
    },
    {
      id: "doc_design_guide",
      title: "Design System & Typography Guidelines",
      ownerId: "user_jordan",
      html: `<h1>Design System &amp; Typography Guidelines</h1><p>This guideline is owned by <strong>Jordan Taylor</strong> and shared with <strong>Alex Rivera</strong> as <u>View Only</u>.</p><h3>Visual Principles</h3><ul><li><p>Crisp paper-on-canvas document surface</p></li><li><p>High-contrast accessible formatting controls</p></li><li><p>Clear role badges for Owners, Editors, and Viewers</p></li></ul>`,
    },
  ];

  for (const doc of starterDocs) {
    await client.execute({
      sql: `
        INSERT INTO documents (id, title, content_html, content_json, owner_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [doc.id, doc.title, doc.html, "{}", doc.ownerId, now, now],
    });
  }

  const starterShares = [
    { id: "share_1", docId: "doc_q4_roadmap", userId: "user_sarah", perm: "EDIT" },
    { id: "share_2", docId: "doc_q4_roadmap", userId: "user_jordan", perm: "VIEW" },
    { id: "share_3", docId: "doc_collab_spec", userId: "user_alex", perm: "EDIT" },
    { id: "share_4", docId: "doc_design_guide", userId: "user_alex", perm: "VIEW" },
  ];

  for (const share of starterShares) {
    await client.execute({
      sql: `
        INSERT INTO document_shares (id, document_id, user_id, permission, shared_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [share.id, share.docId, share.userId, share.perm, now],
    });
  }
}

export async function ensureDbInitialized(): Promise<DbClient> {
  if (!initPromise) {
    initPromise = (async () => {
      const client = await openDatabase();
      await createSchema(client);
      await seedUsers(client);
      await seedStarterDocuments(client);
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
  if (!clientInstance) {
    throw new Error("Database client failed to initialize");
  }
  return clientInstance;
}

export function closeDbClient(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  clientInstance = null;
  initPromise = null;
}
