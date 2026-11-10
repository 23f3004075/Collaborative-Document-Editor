"use client";

import React, { useState } from "react";
import { AlertCircle, Loader2, Shield, Trash2, UserPlus, X } from "lucide-react";
import { usePersona } from "@/context/PersonaContext";
import type { DocumentWithAccess, ShareRole } from "@/types/domain";
import { RoleBadge, UserAvatar } from "./RoleBadge";

interface ShareModalProps {
  document: DocumentWithAccess | null;
  onClose: () => void;
  onUpdated: (updated: DocumentWithAccess) => void;
}

export function ShareModal({ document, onClose, onUpdated }: ShareModalProps) {
  const { personas } = usePersona();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permission, setPermission] = useState<ShareRole>("EDIT");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!document) return null;

  const isOwner = document.accessRole === "OWNER";
  const sharedUserIds = new Set(document.shares.map((s) => s.userId));
  const availableUsers = personas.filter(
    (p) => p.id !== document.ownerId && !sharedUserIds.has(p.id)
  );

  async function handleGrantAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!document || !selectedUserId) return;
    await updateShare(selectedUserId, permission);
    setSelectedUserId("");
  }

  async function updateShare(targetUserId: string, role: ShareRole) {
    if (!document) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${document.id}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, permission: role }),
      });
      const data = (await res.json()) as {
        document?: DocumentWithAccess;
        error?: string;
      };
      if (!res.ok || !data.document) {
        throw new Error(data.error ?? "Could not update sharing permissions");
      }
      onUpdated(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update access");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRevoke(targetUserId: string) {
    if (!document) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/documents/${document.id}/shares?userId=${encodeURIComponent(targetUserId)}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as {
        document?: DocumentWithAccess;
        error?: string;
      };
      if (!res.ok || !data.document) {
        throw new Error(data.error ?? "Could not revoke access");
      }
      onUpdated(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke access");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h2 className="text-base font-semibold text-slate-900 truncate">
              Share &ldquo;{document.title}&rdquo;
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage team access and editing permissions
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

        <div className="p-5 space-y-5">
          {isOwner ? (
            <form onSubmit={handleGrantAccess} className="flex flex-wrap gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={availableUsers.length === 0 || isSaving}
                className="flex-1 min-w-[180px] rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">
                  {availableUsers.length === 0
                    ? "All team members already have access"
                    : "Select teammate to share with..."}
                </option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.roleTitle})
                  </option>
                ))}
              </select>

              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as ShareRole)}
                disabled={isSaving}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="EDIT">Can Edit</option>
                <option value="VIEW">Can View</option>
              </select>

              <button
                type="submit"
                disabled={!selectedUserId || isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Share
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <Shield className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Only the document owner (<strong>{document.owner.name}</strong>)
                can modify sharing permissions.
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              People with access
            </h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar user={document.owner} size="md" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {document.owner.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {document.owner.email}
                    </div>
                  </div>
                </div>
                <RoleBadge role="OWNER" />
              </div>

              {document.shares.length === 0 ? (
                <div className="px-3.5 py-3 text-xs text-slate-400 text-center">
                  Not shared with anyone else yet.
                </div>
              ) : (
                document.shares.map((share) => {
                  const person = share.user;
                  if (!person) return null;
                  return (
                    <div
                      key={share.id}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar user={person} size="md" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {person.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {person.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isOwner ? (
                          <>
                            <select
                              value={share.permission}
                              disabled={isSaving}
                              onChange={(e) =>
                                updateShare(
                                  person.id,
                                  e.target.value as ShareRole
                                )
                              }
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="EDIT">Can Edit</option>
                              <option value="VIEW">Can View</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleRevoke(person.id)}
                              disabled={isSaving}
                              title="Revoke access"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <RoleBadge role={share.permission} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

