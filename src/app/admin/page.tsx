import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { AdminConsoleClient } from "@/components/AdminConsoleClient";
import { Navbar } from "@/components/Navbar";
import { PendingApprovalScreen } from "@/components/PendingApprovalScreen";
import { getAuthenticatedUserFromCookies } from "@/lib/auth";
import { listAllDocumentsForAdmin } from "@/lib/repositories/documentRepository";
import { listAllUsers } from "@/lib/repositories/userRepository";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const activeUser = await getAuthenticatedUserFromCookies();
  if (!activeUser) {
    redirect("/login");
  }
  if (activeUser.approvalStatus !== "APPROVED") {
    return <PendingApprovalScreen user={activeUser} />;
  }

  if (activeUser.systemRole !== "ADMIN") {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-semibold text-slate-900">
              Admin Access Required
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Only workspace Admins (such as the Lead Engineer) can approve
              members, assign admin roles, or approve documents here.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Documents
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const [users, documents] = await Promise.all([
    listAllUsers(),
    listAllDocumentsForAdmin(activeUser.id),
  ]);

  return (
    <AdminConsoleClient
      initialUsers={users}
      initialDocuments={documents}
      currentAdminId={activeUser.id}
    />
  );
}

