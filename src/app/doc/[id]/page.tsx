import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { DocumentEditorClient } from "@/components/DocumentEditorClient";
import { Navbar } from "@/components/Navbar";
import { PendingApprovalScreen } from "@/components/PendingApprovalScreen";
import { getAuthenticatedUserFromCookies } from "@/lib/auth";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { getDocumentById } from "@/lib/repositories/documentRepository";

export const dynamic = "force-dynamic";

interface DocPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: DocPageProps) {
  const { id } = await params;
  const activeUser = await getAuthenticatedUserFromCookies();
  if (!activeUser) {
    redirect("/login");
  }
  if (activeUser.approvalStatus !== "APPROVED") {
    return <PendingApprovalScreen user={activeUser} />;
  }

  try {
    const document = await getDocumentById(id, activeUser.id);
    return <DocumentEditorClient initialDocument={document} />;
  } catch (error) {
    const isForbidden = error instanceof ForbiddenError;
    const isNotFound = error instanceof NotFoundError;
    const heading = isForbidden
      ? "Access Restricted"
      : isNotFound
        ? "Document Not Found"
        : "Unable to Open Document";
    const description = isForbidden
      ? "The currently signed-in account does not have permission to view this document. Switch accounts or return to your dashboard."
      : "This document may have been deleted or the link is invalid.";

    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-semibold text-slate-900">{heading}</h1>
            <p className="text-sm text-slate-500 mt-2">{description}</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to My Documents
            </Link>
          </div>
        </main>
      </div>
    );
  }
}
