# Architecture Note — Ajaia Docs

## 1. Prioritization & Product Judgment

Within a 4–6 hour timebox, attempting to build Google Docs' full surface (live multi-cursor CRDTs, inline comment threads, complex pagination) creates brittle edge cases at the expense of core usability. Instead, this build prioritizes **a deep, cohesive vertical slice**:

1. **Coherent Authoring Experience:** Using **TipTap (ProseMirror)** instead of raw `contentEditable` ensures reliable cross-browser keyboard shortcuts, clean HTML/JSON state, and structured formatting (`H1–H3`, bold, italic, underline, lists, checklists, blockquotes).
2. **Server-Enforced RBAC:** Permissions (`OWNER`, `EDIT`, `VIEW`) are enforced both visually in React and strictly on the server inside repository methods (`src/lib/repositories/documentRepository.ts`) before any read, edit, share, attachment upload, or delete executes.
3. **Evaluator Ergonomics:** A cookie-persisted **Team Persona Switcher** (`src/context/PersonaContext.tsx` + `/api/persona`) removes signup friction so reviewers can verify cross-user sharing and read-only enforcement in two clicks.

---

## 2. System Architecture

```
Browser (Next.js Client Components)
  ├── DashboardClient        ──► GET / POST /api/documents
  ├── ImportModal            ──► POST /api/documents/import (.txt / .md)
  ├── DocumentEditorClient   ──► PATCH / DELETE /api/documents/[id]
  ├── ShareModal             ──► POST / DELETE /api/documents/[id]/shares
  └── AttachmentsDrawer      ──► POST / GET / DELETE /api/documents/[id]/attachments
          │
          ▼
Next.js Route Handlers (Zod Validation + Cookie Persona Resolution)
          │
          ▼
Domain & Repository Layer
  ├── src/lib/permissions.ts         (Pure RBAC predicate functions)
  ├── src/lib/fileImport.ts          (Markdown/Text parser + HTML sanitization)
  └── src/lib/repositories/documentRepository.ts
          │
          ▼
Persistence Layer (src/lib/db.ts)
  ├── Local / Node: sql.js WebAssembly SQLite (./data/ajaia.db)
  └── Serverless (Vercel): src/lib/tursoHttp.ts over Turso Hrana HTTP (/v2/pipeline)
```

---

## 3. Data Model

Four normalized relational tables in `src/lib/db.ts`:
- **`users`**: Seeded team personas (`id`, `name`, `email`, `role_title`, `avatar_color`, `initials`).
- **`documents`**: Document title, rich HTML (`content_html`), ProseMirror JSON (`content_json`), `owner_id`, and ISO timestamps.
- **`document_shares`**: Unique `(document_id, user_id)` constraint mapping each collaborator to `'EDIT'` or `'VIEW'`.
- **`attachments`**: Binary reference files linked to `document_id` with MIME type, byte size, uploader ID, and base64 payload.

---

## 4. Key Tradeoffs & Rationale

| Decision | Choice Made | Alternative Considered | Rationale |
| :--- | :--- | :--- | :--- |
| **Persistence Sync** | `600ms` debounced auto-save over REST (`PATCH`) | WebSocket CRDT (`Yjs` + `Hocuspocus`) | CRDT servers introduce stateful socket hosting complexity and conflict edge cases unsuitable for a 4–6h serverless-ready timebox. |
| **Auth / Identity** | Cookie-backed Seeded Persona Switcher | OAuth / Email-Password JWT | Eliminates reviewer signup overhead while keeping real server-side user isolation and authorization checks intact. |
| **Database Driver** | `sql.js` (local WASM SQLite) + zero-dependency Turso HTTP adapter (`src/lib/tursoHttp.ts`) | `better-sqlite3` or `@libsql/client` native bindings | Eliminates OS-specific native addon mismatches (Windows vs. WSL/Linux `@libsql/linux-x64-gnu`) locally while delivering shared multi-lambda persistence on Vercel via standard `fetch`. |
| **File Import Scope** | `.txt` and `.md` only | `.docx` / `.pdf` parsing | Native Markdown and plain text parsing via `marked` + HTML escaping avoids fragile native/WASM office parsers and clearly sets user expectations in UI and docs. |

