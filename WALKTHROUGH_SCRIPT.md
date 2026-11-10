# Walkthrough Video Script (3–5 Minutes)

### 0:00 – 0:45 | Introduction & Product Framing
- **Goal:** Show a focused, production-ready collaborative document editor ("Ajaia Docs") built within the 4–6 hour timebox.
- **Key Judgment:** Prioritized a crisp editing surface, reliable persistence, real RBAC sharing enforcement, and zero-friction reviewer testing over fragile real-time WebSocket CRDTs.

### 0:45 – 2:00 | End-to-End Core Flow Demo
1. **Dashboard Overview:** Point out **My Documents** vs **Shared with Me** tabs, role badges (`Owner`, `Can Edit`, `View Only`), and live search.
2. **Create & Edit:** Click **New Document**, rename inline, demonstrate Headings (`H1/H2`), Bold, Italic, Underline, Bulleted/Numbered lists, Checklists, and watch the `Saving...` → `Saved` indicator + live word count. Refresh the browser to show persistence.
3. **File Import & Attachments:** Click **Import .txt / .md**, drag in a sample `.md` file, and show it converted into a formatted editable document. Open **Attachments** drawer to attach and download a reference file.
4. **Export (Stretch):** Show Markdown (`.md`) / Print PDF export.

### 2:00 – 3:15 | Sharing & Permission Enforcement Demo
1. Open the **Share** modal as **Alex Rivera**, add **Jordan Taylor** as `Can View` or **Sarah Chen** as `Can Edit`.
2. Use the **Switch Team Persona** menu in the top right to switch to **Jordan Taylor**.
3. Show **Shared with Me** tab, open the document, and highlight **View Only Mode**: formatting toolbar is hidden, editor is read-only, and API mutations return `403 Forbidden`.
4. Switch to **Sarah Chen** (`Can Edit`) and show collaborative editing works while Delete/Share admin remain restricted to the Owner.

### 3:15 – 4:15 | Architecture & Automated Testing
- Walk briefly through `src/lib/db.ts` (`sql.js` WebAssembly SQLite for zero-config cross-platform persistence), `src/lib/permissions.ts`, and `src/lib/repositories/documentRepository.ts`.
- Run `npm test` in terminal to show all Vitest unit & integration tests passing.

### 4:15 – 4:45 | AI-Native Workflow Reflection
- Share how AI accelerated boilerplate, Zod validation, and test scaffolding, and specifically call out where human judgment overruled AI output (replacing native `@libsql/client` bindings with pure WASM `sql.js` after hitting cross-OS Windows/WSL native binary issues, adding TipTap `immediatelyRender: false` for Next.js 15 SSR, and moving integration tests to `:memory:` to avoid file-lock issues).

