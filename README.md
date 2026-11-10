# Ajaia Docs — Lightweight Collaborative Document Editor

A focused, full-stack collaborative document editor inspired by Google Docs, built with **Next.js (App Router)**, **TypeScript**, **TipTap (ProseMirror)**, **Tailwind CSS**, and **SQLite (`sql.js` WebAssembly)**.

---

## Key Capabilities

1. **Document Creation & Rich-Text Editing**
   - Create, rename, edit, save, and delete documents.
   - TipTap-powered rich-text formatting: **Bold**, *Italic*, <u>Underline</u>, Strikethrough, Inline Code, Headings (`H1`, `H2`, `H3`), Bulleted Lists, Numbered Lists, Checklists, Blockquotes, Horizontal Rules, and Undo/Redo.
   - Debounced auto-save (`600ms`) with live status pill (`Saved`, `Saving...`, `Unsaved changes`, `Save failed`) plus `Ctrl+S` / `Cmd+S` immediate save shortcut.
   - Word count, character count, and estimated reading time in the editor footer.

2. **File Upload & Export**
   - **Import as New Document:** Upload `.txt` or `.md` files (up to `5 MB`) via drag-and-drop or file picker. Markdown headings, bold/italic text, and lists are parsed into rich formatting; plain text is safely converted into paragraphs.
   - **Document Attachments:** Attach reference assets (`.txt`, `.md`, `.pdf`, `.png`, `.jpg`, `.jpeg`, `.csv`, `.json`, up to `2 MB`) directly to any document, with download and removal support.
   - **Export (Stretch):** Export any document as Markdown (`.md`), Plain Text (`.txt`), or Print-ready PDF.

3. **Sharing & Access Control (RBAC)**
   - **Owner:** Full control (edit, rename, share/revoke, delete).
   - **Editor (`EDIT`):** Can edit title/content and manage attachments; cannot delete or change sharing settings.
   - **Viewer (`VIEW`):** Strict read-only mode (formatting toolbar hidden, editor non-editable, server-side `403 Forbidden` enforcement on mutations).
   - **Visible Segmentation:** Dashboard clearly separates **My Documents** (owned) from **Shared with Me** (with role badges and owner attribution).

4. **Zero-Friction Seeded Team Personas**
   Switch personas anytime using the top-right header switcher to test multi-user sharing immediately without creating accounts:
   - **Alex Rivera** (`alex@ajaia.io` — Engineering Lead, default user)
   - **Sarah Chen** (`sarah@ajaia.io` — Product Manager)
   - **Jordan Taylor** (`jordan@ajaia.io` — UX Designer)

---

## Local Setup & Run Instructions

### Prerequisites
- **Node.js** `20+` (developed and verified on Node `v26.13.0`)
- **npm** `10+`

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Zero-Config Database:** On first launch, `src/lib/db.ts` automatically creates `./data/ajaia.db`, initializes the schema, and seeds the 3 team personas along with 3 starter documents demonstrating Owner, Editor, and Viewer relationships.

### 3. Run Verification Checks
```bash
# TypeScript strict check
npm run typecheck

# Automated test suite (Vitest)
npm test

# Production build
npm run build
npm start
```

---

## Supported File Types & Limits

| Workflow | Supported Formats | Size Limit | Behavior |
| :--- | :--- | :--- | :--- |
| **Import as Document** | `.txt`, `.md` | `5 MB` | Parses Markdown/plain text into a new editable rich-text document |
| **Document Attachments** | `.txt`, `.md`, `.pdf`, `.png`, `.jpg`, `.jpeg`, `.csv`, `.json` | `2 MB` | Stored with document metadata; downloadable by anyone with view access |

---

## Deployment Guide

### Option A: Render / Railway / Node Server (Zero External DB Needed)
1. Connect the repository as a Node.js web service.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Attach a persistent disk mounted at `/app/data` (or configure `TURSO_DATABASE_URL`).

### Option B: Vercel + Turso (Recommended Serverless Path)
1. Create a free [Turso](https://turso.tech/) database and grab `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
2. Add both environment variables in Vercel Project Settings.
3. Deploy via `vercel --prod` or Git integration. *(If omitted on Vercel, the app falls back to `/tmp/ajaia.db` for ephemeral demo sessions.)*

---

## Project Documentation Index
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Architecture decisions, data model, and tradeoff analysis.
- [`AI_WORKFLOW.md`](./AI_WORKFLOW.md) — AI-native engineering workflow, rejected suggestions, and verification methods.
- [`SUBMISSION.md`](./SUBMISSION.md) — Complete deliverables checklist, status summary, and next-step roadmap.
- [`WALKTHROUGH_SCRIPT.md`](./WALKTHROUGH_SCRIPT.md) — 3–5 minute video walkthrough guide.

