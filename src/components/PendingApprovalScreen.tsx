"use client";

import React from "react";
import { Clock, LogOut, XCircle } from "lucide-react";
import { usePersona } from "@/context/PersonaContext";
import type { User } from "@/types/domain";

export function PendingApprovalScreen({ user }: { user: User }) {
  const { logout } = usePersona();
  const isRejected = user.approvalStatus === "REJECTED";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isRejected
              ? "bg-red-50 text-red-600"
              : "bg-amber-50 text-amber-600"
          }`}
        >
          {isRejected ? (
            <XCircle className="w-6 h-6" />
          ) : (
            <Clock className="w-6 h-6" />
          )}
        </div>
        <h1 className="text-lg font-semibold text-slate-900">
          {isRejected ? "Account Access Not Approved" : "Awaiting Admin Approval"}
        </h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          {isRejected
            ? `Hi ${user.name}, your workspace access request was declined by an Admin.`
            : `Hi ${user.name}, your account (${user.email}) has been created and is waiting for an Admin (e.g., Alex Rivera, Engineering Lead) to approve access.`}
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

