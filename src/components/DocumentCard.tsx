"use client";

import React from "react";
import Link from "next/link";
import {
  Clock,
  Download,
  FileText,
  Paperclip,
  Share2,
  Trash2,
} from "lucide-react";
import type { DocumentWithAccess } from "@/types/domain";
import { htmlToPlainText } from "@/lib/fileExport";
import { RoleBadge, UserAvatar } from "./RoleBadge";

interface DocumentCardProps {
  document: DocumentWithAccess;
  onShare: (doc: DocumentWithAccess) => void;
  onDelete: (doc: DocumentWithAccess) => void;
  onExportMarkdown: (doc: DocumentWithAccess) => void;
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DocumentCard({
  document,
  onShare,
  onDelete,
  onExportMarkdown,
}: DocumentCardProps) {
  const previewText = htmlToPlainText(document.contentHtml).slice(0, 140);
  const isOwner = document.accessRole === "OWNER";

  return (
    <article className="group bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between p-4">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <Link
            href={`/doc/${document.id}`}
            className="flex items-start gap-2.5 min-w-0 flex-1"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
              {document.title}
            </h3>
          </Link>
          <RoleBadge role={document.accessRole} />
        </div>

        <Link href={`/doc/${document.id}`} className="block mt-2">
          <p className="text-xs text-slate-500 line-clamp-3 min-h-[3.25rem] leading-relaxed">
            {previewText || "Empty document — click to start writing..."}
          </p>
        </Link>
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {!isOwner && (
            <div className="flex items-center gap-1.5 min-w-0">
              <UserAvatar user={document.owner} size="sm" />
              <span className="text-[11px] text-slate-500 truncate">
                {document.owner.name}
              </span>
            </div>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
            <Clock className="w-3 h-3" />
            {formatRelativeDate(document.updatedAt)}
          </span>
          {document.attachmentCount > 0 && (
            <span
              title={`${document.attachmentCount} attachment(s)`}
              className="inline-flex items-center gap-0.5 text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded"
            >
              <Paperclip className="w-3 h-3" />
              {document.attachmentCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onShare(document)}
            title={isOwner ? "Share document" : "View collaborators"}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onExportMarkdown(document)}
            title="Export as Markdown (.md)"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => onDelete(document)}
              title="Delete document"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

