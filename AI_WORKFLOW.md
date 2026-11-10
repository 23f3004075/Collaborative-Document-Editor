# AI-Native Workflow Note

## 1. AI Tools Used
- **Antigravity AI Coding Agent (Gemini):** Used as a pair-programming engineering assistant across planning (`PROJECT_PLAN.md`), domain modeling, TypeScript API/UI implementation, test authoring, and debugging.

---

## 2. Where AI Materially Sped Up Work
1. **Upfront Architecture & Scope Calibration:** Structuring the 4–6 hour phased roadmap, ER diagram, and concrete tradeoff table before writing code prevented scope creep.
2. **Boilerplate & Schema Wiring:** Rapidly generating typed Zod schemas (`src/lib/validation.ts`), SQLite DDL + seed fixtures (`src/lib/db.ts`), and modular API routes with uniform error mapping (`src/lib/apiResponse.ts`).
3. **Test Suite Scaffolding:** Drafting unit and integration tests (`permissions.test.ts`, `fileImport.test.ts`, `repository.test.ts`) to cover RBAC edge cases and markdown sanitization.

---

## 3. AI-Generated Output Changed or Rejected
1. **Database Driver Selection (`@libsql/client` / `better-sqlite3` → `sql.js`):** Initial planning considered `better-sqlite3` or `@libsql/client`. When running across Windows and WSL/Linux environments sharing `node_modules`, platform-specific native addons (`@libsql/linux-x64-gnu` vs `win32-x64-msvc`) fail to resolve. Replaced native bindings with pure WebAssembly SQLite (`sql.js`) behind a clean `DbClient` interface (`src/lib/db.ts`) and explicit row mappers (`src/lib/repositories/mappers.ts`) so the app runs identically across Windows, WSL, Linux, and cloud hosts with zero native compilation.
2. **TipTap SSR Hydration Guard:** Standard TipTap `useEditor` setups throw React SSR hydration mismatch warnings in Next.js 15 App Router. Explicitly added `immediatelyRender: false` and persona-change `useEffect` synchronization (`editor.setEditable(nextEditable)`) so switching from an Owner/Editor persona to a Viewer persona immediately locks the active editor instance.
3. **Windows Temp-Directory File Lock in Tests:** An initial integration test setup created a temp SQLite file on disk and attempted `fs.rmSync(tempDir)` in `afterAll`, which triggered a Windows `EPERM` handle lock error even though all test assertions passed. Replaced the temp-file fixture with an isolated in-memory database (`TURSO_DATABASE_URL=":memory:"`) and added an explicit `closeDbClient()` lifecycle helper.

---

## 4. Verification of Correctness, UX & Reliability
- **Static Type Checking:** Verified zero TypeScript errors via `npm run typecheck` (`tsc --noEmit` with `"strict": true`).
- **Automated Tests:** Executed `npm test` (`vitest run`) covering RBAC predicates, Markdown/text ingestion + XSS `<script>` stripping, file size/type rejections, and end-to-end SQLite repository sharing/attachment mutations.
- **Production Build Verification:** Verified full Next.js App Router compilation and bundling via `npm run build`.
- **Interactive UI Verification:** Verified end-to-end document creation, formatting, persona switching, sharing modal, and persistence across browser reloads.

