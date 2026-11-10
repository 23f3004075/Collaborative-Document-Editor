"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import type {
  DocumentWithAccess,
  SystemRole,
  User,
  UserApprovalStatus,
} from "@/types/domain";
import { Navbar } from "./Navbar";
import { ApprovalBadge, SystemRoleBadge, UserAvatar } from "./RoleBadge";

interface AdminConsoleClientProps {
  initialUsers: User[];
  initialDocuments: DocumentWithAccess[];
  currentAdminId: string;
}

export function AdminConsoleClient({
  initialUsers,
  initialDocuments,
  currentAdminId,
}: AdminConsoleClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [documents, setDocuments] =
    useState<DocumentWithAccess[]>(initialDocuments);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshOverview() {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      const data = (await res.json()) as {
        users?: User[];
        documents?: DocumentWithAccess[];
        error?: string;
      };
      if (!res.ok || !data.users || !data.documents) {
        throw new Error(data.error ?? "Failed to refresh admin console");
      }
      setUsers(data.users);
      setDocuments(data.documents);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function updateUser(
    userId: string,
    payload: { systemRole?: SystemRole; approvalStatus?: UserApprovalStatus }
  ) {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { user?: User; error?: string };
      if (!res.ok || !data.user) {
        throw new Error(data.error ?? "Failed to update user");
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? data.user! : u)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function reviewDocument(docId: string, action: "APPROVE" | "REJECT") {
    setBusyId(docId);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${docId}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as {
        document?: DocumentWithAccess;
        error?: string;
      };
      if (!res.ok || !data.document) {
        throw new Error(data.error ?? "Failed to update document status");
      }
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? { ...d, approvalStatus: data.document!.approvalStatus }
            : d
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  }

  const pendingUsersCount = users.filter(
    (u) => u.approvalStatus === "PENDING"
  ).length;
  const pendingDocsCount = documents.filter(
    (d) => d.approvalStatus === "PENDING_APPROVAL"
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Documents
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-violet-600" />
              Admin Console
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Approve member access, assign Admin roles, and review document sign-offs.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-medium text-slate-700">
              Pending Members: <strong>{pendingUsersCount}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-medium text-slate-700">
              Pending Docs: <strong>{pendingDocsCount}</strong>
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Team Members &amp; Role Assignment ({users.length})
              </h2>
            </div>
            <button
              type="button"
              disabled={isRefreshing}
              onClick={() => void refreshOverview()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-600 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {users.map((member) => {
              const isSelf = member.id === currentAdminId;
              const isBusy = busyId === member.id;
              return (
                <div
                  key={member.id}
                  className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar user={member} size="md" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                        <span>{member.name}</span>
                        {isSelf && (
                          <span className="text-[10px] text-slate-400">(You)</span>
                        )}
                        <SystemRoleBadge role={member.systemRole} />
                        {member.approvalStatus === "PENDING" && (
                          <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Approval
                          </span>
                        )}
                        {member.approvalStatus === "REJECTED" && (
                          <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
                            Rejected
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {member.roleTitle} • {member.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {member.approvalStatus !== "APPROVED" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void updateUser(member.id, { approvalStatus: "APPROVED" })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    )}

                    {member.approvalStatus === "PENDING" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void updateUser(member.id, { approvalStatus: "REJECTED" })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-xs font-medium"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    )}

                    {member.approvalStatus === "APPROVED" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void updateUser(member.id, {
                            systemRole:
                              member.systemRole === "ADMIN" ? "MEMBER" : "ADMIN",
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
                          member.systemRole === "ADMIN"
                            ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                            : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                        }`}
                      >
                        {member.systemRole === "ADMIN"
                          ? "Remove Admin"
                          : "Assign Admin"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Document Approval Queue ({documents.length})
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {documents.map((doc) => {
              const isBusy = busyId === doc.id;
              return (
                <div
                  key={doc.id}
                  className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/doc/${doc.id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-indigo-600 truncate"
                      >
                        {doc.title}
                      </Link>
                      <ApprovalBadge status={doc.approvalStatus} />
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Owner: {doc.owner.name} ({doc.owner.roleTitle})
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {doc.approvalStatus !== "APPROVED" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void reviewDocument(doc.id, "APPROVE")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    )}
                    {doc.approvalStatus !== "REJECTED" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void reviewDocument(doc.id, "REJECT")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-xs font-medium"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

