"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileUp,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { usePersona } from "@/context/PersonaContext";
import { htmlToMarkdown } from "@/lib/fileExport";
import type {
  DocumentWithAccess,
  UserDocumentCollections,
} from "@/types/domain";
import { DocumentCard } from "./DocumentCard";
import { ImportModal } from "./ImportModal";
import { Navbar } from "./Navbar";
import { ShareModal } from "./ShareModal";

interface DashboardClientProps {
  initialCollections: UserDocumentCollections;
}

type ActiveTab = "owned" | "shared";

export function DashboardClient({ initialCollections }: DashboardClientProps) {
  const router = useRouter();
  const { activeUser } = usePersona();
  const [collections, setCollections] =
    useState<UserDocumentCollections>(initialCollections);
  const [activeTab, setActiveTab] = useState<ActiveTab>("owned");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sharingDoc, setSharingDoc] = useState<DocumentWithAccess | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setCollections(initialCollections);
  }, [initialCollections]);

  const activeList = useMemo(() => {
    const base =
      activeTab === "owned" ? collections.owned : collections.shared;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return base;
    return base.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.owner.name.toLowerCase().includes(query)
    );
  }, [activeTab, collections, searchQuery]);

  async function handleCreateDocument() {
    setIsCreating(true);
    setActionError(null);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Document",
          contentHtml: "<p></p>",
          contentJson: "{}",
        }),
      });
      const data = (await res.json()) as {
        document?: { id: string };
        error?: string;
      };
      if (!res.ok || !data.document) {
        throw new Error(data.error ?? "Failed to create document");
      }
      router.push(`/doc/${data.document.id}`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not create document"
      );
      setIsCreating(false);
    }
  }

  async function handleDeleteDocument(doc: DocumentWithAccess) {
    const confirmed = window.confirm(
      `Delete "${doc.title}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setActionError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete document");
      }
      setCollections((prev) => ({
        ...prev,
        owned: prev.owned.filter((item) => item.id !== doc.id),
      }));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not delete document"
      );
    }
  }

  function handleExportMarkdown(doc: DocumentWithAccess) {
    const md = htmlToMarkdown(doc.title, doc.contentHtml);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${doc.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "document"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleShareUpdated(updated: DocumentWithAccess) {
    setSharingDoc(updated);
    setCollections((prev) => ({
      owned: prev.owned.map((d) => (d.id === updated.id ? updated : d)),
      shared: prev.shared.map((d) => (d.id === updated.id ? updated : d)),
    }));
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back, {activeUser.name.split(" ")[0]}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create, import, and collaborate on team documents.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 shadow-sm transition-colors"
            >
              <FileUp className="w-4 h-4 text-slate-500" />
              Import .txt / .md
            </button>
            <button
              type="button"
              onClick={handleCreateDocument}
              disabled={isCreating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-sm font-medium text-white shadow-sm transition-colors"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              New Document
            </button>
          </div>
        </div>

        {actionError && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {actionError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="inline-flex p-1 bg-slate-200/70 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setActiveTab("owned")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "owned"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              My Documents
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                {collections.owned.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("shared")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "shared"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-4 h-4" />
              Shared with Me
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                {collections.shared.length}
              </span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {activeList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <p className="text-base font-medium text-slate-700">
              {searchQuery
                ? "No matching documents found."
                : activeTab === "owned"
                  ? "You haven't created any documents yet."
                  : "No documents have been shared with this account yet."}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === "owned"
                ? "Create a blank document or import a .txt / .md file to get started."
                : "Switch personas in the top right to share a document with this user."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeList.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onShare={setSharingDoc}
                onDelete={handleDeleteDocument}
                onExportMarkdown={handleExportMarkdown}
              />
            ))}
          </div>
        )}
      </main>

      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(newId) => {
          setImportOpen(false);
          router.push(`/doc/${newId}`);
        }}
      />

      <ShareModal
        document={sharingDoc}
        onClose={() => setSharingDoc(null)}
        onUpdated={handleShareUpdated}
      />
    </div>
  );
}

