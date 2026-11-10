"use client";

import React, { useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  File,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  SUPPORTED_ATTACHMENT_EXTENSIONS,
  validateAttachmentFile,
} from "@/lib/validation";
import type { DocumentAttachment } from "@/types/domain";

interface AttachmentsDrawerProps {
  documentId: string;
  attachments: DocumentAttachment[];
  canEdit: boolean;
  isOpen: boolean;
  onClose: () => void;
  onAttachmentsChange: (next: DocumentAttachment[]) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AttachmentsDrawer({
  documentId,
  attachments,
  canEdit,
  isOpen,
  onClose,
  onAttachmentsChange,
}: AttachmentsDrawerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validation = validateAttachmentFile(file.name, file.size);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/documents/${documentId}/attachments`, {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as {
        attachment?: DocumentAttachment;
        error?: string;
      };
      if (!res.ok || !data.attachment) {
        throw new Error(data.error ?? "Failed to upload attachment");
      }
      onAttachmentsChange([data.attachment, ...attachments]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(attachmentId: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/documents/${documentId}/attachments/${attachmentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not delete attachment");
      }
      onAttachmentsChange(attachments.filter((a) => a.id !== attachmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <aside className="no-print fixed right-0 top-14 bottom-0 w-80 sm:w-96 bg-white border-l border-slate-200 shadow-xl z-40 flex flex-col">
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            Attachments ({attachments.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {canEdit && (
          <div>
            <input
              ref={inputRef}
              type="file"
              accept={SUPPORTED_ATTACHMENT_EXTENSIONS.join(",")}
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-2.5 px-4 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Attach Reference File
            </button>
            <p className="text-[11px] text-slate-400 mt-1.5 text-center">
              {SUPPORTED_ATTACHMENT_EXTENSIONS.join(", ")} • max 2 MB
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {attachments.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            No files attached to this document yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {attachments.map((att) => (
              <li
                key={att.id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <File className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-800 truncate">
                      {att.fileName}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {formatBytes(att.fileSize)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`/api/documents/${documentId}/attachments/${att.id}`}
                    download={att.fileName}
                    title="Download attachment"
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDelete(att.id)}
                      title="Remove attachment"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

