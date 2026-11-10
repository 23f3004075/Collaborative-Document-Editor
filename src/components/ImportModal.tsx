"use client";

import React, { useRef, useState } from "react";
import { AlertCircle, FileUp, Loader2, X } from "lucide-react";
import {
  SUPPORTED_IMPORT_EXTENSIONS,
  validateImportFile,
} from "@/lib/validation";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (documentId: string) => void;
}

export function ImportModal({
  isOpen,
  onClose,
  onImported,
}: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleFileSelection(file: File | null) {
    setError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const validation = validateImportFile(file.name, file.size);
    if (!validation.valid) {
      setError(validation.error);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a .txt or .md file first.");
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/documents/import", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as {
        document?: { id: string };
        error?: string;
      };
      if (!res.ok || !data.document) {
        throw new Error(data.error ?? "Failed to import file");
      }
      setSelectedFile(null);
      onImported(data.document.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Import File as New Document
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Supported formats: {SUPPORTED_IMPORT_EXTENSIONS.join(", ")} (max 5 MB)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileSelection(e.dataTransfer.files?.[0] ?? null);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-indigo-500 bg-indigo-50/50"
                : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              className="hidden"
              onChange={(e) => handleFileSelection(e.target.files?.[0] ?? null)}
            />
            <FileUp className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            {selectedFile ? (
              <div>
                <p className="text-sm font-medium text-slate-800 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Ready to import
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Click to choose or drag &amp; drop a file
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Markdown headers &amp; lists will become rich formatting
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
              Import &amp; Open
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

