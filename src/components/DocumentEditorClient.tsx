"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CloudOff,
  Download,
  Eye,
  Loader2,
  Paperclip,
  Printer,
  Share2,
} from "lucide-react";
import { canEditDocument } from "@/lib/permissions";
import { htmlToMarkdown, htmlToPlainText } from "@/lib/fileExport";
import type {
  DocumentAttachment,
  DocumentDetail,
  DocumentWithAccess,
} from "@/types/domain";
import { AttachmentsDrawer } from "./AttachmentsDrawer";
import { EditorToolbar } from "./EditorToolbar";
import { Navbar } from "./Navbar";
import { RoleBadge } from "./RoleBadge";
import { ShareModal } from "./ShareModal";

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface DocumentEditorClientProps {
  initialDocument: DocumentDetail;
}

function SaveStatusPill({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
        Saving...
      </span>
    );
  }
  if (status === "unsaved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
        Unsaved changes
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-red-600">
        <CloudOff className="w-3.5 h-3.5" />
        Save failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Saved
    </span>
  );
}

export function DocumentEditorClient({
  initialDocument,
}: DocumentEditorClientProps) {
  const [doc, setDoc] = useState<DocumentDetail>(initialDocument);
  const [title, setTitle] = useState(initialDocument.title);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const canEdit = canEditDocument(doc.accessRole);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTitleRef = useRef(title);
  latestTitleRef.current = title;

  const persistChanges = useCallback(
    async (payload: {
      title?: string;
      contentHtml?: string;
      contentJson?: string;
    }) => {
      if (!canEdit) return;
      setSaveStatus("saving");
      setSaveError(null);
      try {
        const res = await fetch(`/api/documents/${doc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as {
          document?: DocumentDetail;
          error?: string;
        };
        if (!res.ok || !data.document) {
          throw new Error(data.error ?? "Failed to save document");
        }
        setDoc((prev) => ({
          ...prev,
          title: data.document!.title,
          contentHtml: data.document!.contentHtml,
          contentJson: data.document!.contentJson,
          updatedAt: data.document!.updatedAt,
        }));
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error");
        setSaveError(
          err instanceof Error ? err.message : "Could not save changes"
        );
      }
    },
    [canEdit, doc.id]
  );

  const scheduleSave = useCallback(
    (payload: { title?: string; contentHtml?: string; contentJson?: string }) => {
      if (!canEdit) return;
      setSaveStatus("unsaved");
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        void persistChanges(payload);
      }, 600);
    },
    [canEdit, persistChanges]
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable: canEdit,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Start typing your document here...",
      }),
      CharacterCount,
    ],
    content: initialDocument.contentHtml,
    onUpdate: ({ editor: currentEditor }) => {
      scheduleSave({
        title: latestTitleRef.current.trim() || "Untitled Document",
        contentHtml: currentEditor.getHTML(),
        contentJson: JSON.stringify(currentEditor.getJSON()),
      });
    },
  });

  // Sync state when persona switches or initialDocument updates on server refresh
  useEffect(() => {
    setDoc(initialDocument);
    setTitle(initialDocument.title);
    if (editor) {
      const nextEditable = canEditDocument(initialDocument.accessRole);
      editor.setEditable(nextEditable);
      if (editor.getHTML() !== initialDocument.contentHtml) {
        editor.commands.setContent(initialDocument.contentHtml, false);
      }
    }
  }, [initialDocument, editor]);

  // Ctrl+S immediate save shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canEdit && editor) {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          void persistChanges({
            title: latestTitleRef.current.trim() || "Untitled Document",
            contentHtml: editor.getHTML(),
            contentJson: JSON.stringify(editor.getJSON()),
          });
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canEdit, editor, persistChanges]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  function handleTitleChange(nextTitle: string) {
    setTitle(nextTitle);
    if (!canEdit || !editor) return;
    scheduleSave({
      title: nextTitle.trim() || "Untitled Document",
      contentHtml: editor.getHTML(),
    });
  }

  function triggerDownload(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  }

  function handleShareUpdated(updated: DocumentWithAccess) {
    setDoc((prev) => ({
      ...prev,
      shares: updated.shares,
      accessRole: updated.accessRole,
    }));
  }

  function handleAttachmentsChange(next: DocumentAttachment[]) {
    setDoc((prev) => ({
      ...prev,
      attachments: next,
      attachmentCount: next.length,
    }));
  }

  const wordCount = editor?.storage.characterCount.words() ?? 0;
  const charCount = editor?.storage.characterCount.characters() ?? 0;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const titleSlot = (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <Link
        href="/"
        title="Back to all documents"
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>
      <input
        type="text"
        value={title}
        disabled={!canEdit}
        onChange={(e) => handleTitleChange(e.target.value)}
        aria-label="Document title"
        className="font-semibold text-sm sm:text-base text-slate-900 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-400 focus:bg-white rounded-lg px-2 py-1 min-w-0 w-44 sm:w-72 md:w-96 focus:outline-none disabled:hover:border-transparent"
      />
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <RoleBadge role={doc.accessRole} />
        {canEdit && <SaveStatusPill status={saveStatus} />}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70">
      <Navbar rightSlot={titleSlot} />

      <div className="no-print bg-white border-b border-slate-200 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>
            Owner: <strong className="text-slate-700">{doc.owner.name}</strong>
          </span>
          {doc.shares.length > 0 && (
            <span>• Shared with {doc.shares.length} teammate(s)</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-9 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-40">
                <button
                  type="button"
                  onClick={() =>
                    triggerDownload(
                      `${title || "document"}.md`,
                      htmlToMarkdown(title, editor?.getHTML() ?? doc.contentHtml),
                      "text/markdown;charset=utf-8"
                    )
                  }
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Download Markdown (.md)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    triggerDownload(
                      `${title || "document"}.txt`,
                      htmlToPlainText(editor?.getHTML() ?? doc.contentHtml),
                      "text/plain;charset=utf-8"
                    )
                  }
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Download Plain Text (.txt)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false);
                    window.print();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAttachmentsOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              attachmentsOpen
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 hover:bg-slate-50 text-slate-700"
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            Attachments ({doc.attachments.length})
          </button>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-medium text-white shadow-sm transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>

      {canEdit ? (
        <EditorToolbar editor={editor} />
      ) : (
        <div className="no-print bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-800 flex items-center justify-center gap-2">
          <Eye className="w-3.5 h-3.5" />
          <span>
            <strong>View Only Mode:</strong> You can read and download this
            document, but only the owner or editors can make changes.
          </span>
        </div>
      )}

      {saveError && (
        <div className="no-print max-w-4xl w-full mx-auto mt-4 px-4">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        </div>
      )}

      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="print-sheet max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200/90 px-6 sm:px-14 py-10 sm:py-12">
          <EditorContent editor={editor} />
        </div>
      </main>

      <footer className="no-print bg-white border-t border-slate-200 px-6 py-2 text-xs text-slate-400 flex items-center justify-between">
        <span>
          {wordCount} {wordCount === 1 ? "word" : "words"} • {charCount}{" "}
          characters • ~{readingMinutes} min read
        </span>
        <span className="hidden sm:inline">
          Tip: Use Ctrl+B, Ctrl+I, Ctrl+U or Ctrl+S to save anytime
        </span>
      </footer>

      <ShareModal
        document={shareOpen ? doc : null}
        onClose={() => setShareOpen(false)}
        onUpdated={handleShareUpdated}
      />

      <AttachmentsDrawer
        documentId={doc.id}
        attachments={doc.attachments}
        canEdit={canEdit}
        isOpen={attachmentsOpen}
        onClose={() => setAttachmentsOpen(false)}
        onAttachmentsChange={handleAttachmentsChange}
      />
    </div>
  );
}

