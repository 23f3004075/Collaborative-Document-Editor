# Submission Manifest — Ajaia Docs

**Candidate:** Sourasish Ghosh (`sourasishghosh02@gmail.com`)  
**Assignment:** Ajaia LLC — AI-Native Full Stack Developer Assignment  

---

## 1. Included Deliverables

| Deliverable | File / Location | Description |
| :--- | :--- | :--- |
| **Source Code** | `./src`, `package.json`, config files | Complete Next.js 15 + TypeScript + TipTap + LibSQL application |
| **Project Plan** | [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) | Initial phased execution plan created prior to coding |
| **Setup & Run Guide** | [`README.md`](./README.md) | Local setup instructions, test commands, and deployment guide |
| **Architecture Note** | [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Prioritization rationale, data model, and tradeoff analysis |
| **AI Workflow Note** | [`AI_WORKFLOW.md`](./AI_WORKFLOW.md) | AI tools used, acceleration points, rejected outputs, verification |
| **Walkthrough Script** | [`WALKTHROUGH_SCRIPT.md`](./WALKTHROUGH_SCRIPT.md) | 3–5 minute demo and technical walkthrough outline |
| **Automated Tests** | [`src/__tests__/`](./src/__tests__) | Vitest unit & integration tests (RBAC, file import, DB repository) |
| **Live URL** | `LIVE_URL.txt` *(update upon deployment)* | Hosted deployment link |
| **Walkthrough Video URL** | `VIDEO_URL.txt` *(update after recording)* | Unlisted Loom / YouTube link |

---

## 2. Test Accounts / Seeded Personas

No signup or credentials are required. Use the **Switch Team Persona** menu in the top-right navigation bar:

1. **Alex Rivera** (`alex@ajaia.io`) — Engineering Lead *(Default Persona; owns "Q4 Product Architecture & AI Roadmap")*
2. **Sarah Chen** (`sarah@ajaia.io`) — Product Manager *(Owns "Ajaia Internal Collaboration Spec"; Editor on Alex's roadmap)*
3. **Jordan Taylor** (`jordan@ajaia.io`) — UX Designer *(Owns "Design System & Typography Guidelines"; Viewer on Alex's roadmap)*

---

## 3. Feature Status

### What Is Working End to End
- Create, rename, edit, auto-save (`600ms` debounce + `Ctrl+S`), reopen, and delete documents.
- Rich-text editing: Headings (`H1–H3`), Bold, Italic, Underline, Strikethrough, Inline Code, Bulleted Lists, Numbered Lists, Checklists, Blockquotes, Horizontal Rules, Undo/Redo, Word/Character count.
- File upload (`POST /api/documents/import`): Drag-and-drop `.txt` and `.md` ingestion into new formatted documents with client & server validation.
- Document attachments (`POST/GET/DELETE /api/documents/[id]/attachments`): Upload, download, and remove reference files linked to a document.
- Sharing & RBAC: Grant `Can Edit` or `Can View` permissions, update roles, revoke access, and separate **My Documents** vs **Shared with Me** tabs.
- Export (Stretch): Download Markdown (`.md`), Plain Text (`.txt`), and Print / Save PDF.
- Persistence: Relational SQLite / LibSQL persistence across refreshes and server restarts.
- Automated verification: TypeScript strict typecheck, Vitest unit & integration tests, and Next.js production build.

### Intentionally Deprioritized
- Real-time multi-cursor WebSocket CRDT syncing (e.g., Yjs) in favor of reliable debounced persistence and strict access control.
- External OAuth / password authentication in favor of instant reviewer persona switching.
- Binary `.docx` parsing in favor of clean `.txt` / `.md` document ingestion plus generic file attachments.

### What I Would Build Next (With Another 2–4 Hours)
1. **Document Version History:** Snapshot revisions on save/checkpoint so users can diff and restore prior states.
2. **Inline Comments & Suggestions:** Anchored prose annotations using TipTap marks for async team review.
3. **Playwright E2E Browser Suite:** Automated headless browser tests verifying full UI clicks, modal flows, and cross-persona reload persistence.
4. **Live Presence Polling / SSE:** Lightweight Server-Sent Events or polling heartbeat showing active collaborators viewing the same document.

