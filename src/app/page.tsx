import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/DashboardClient";
import { PendingApprovalScreen } from "@/components/PendingApprovalScreen";
import { getAuthenticatedUserFromCookies } from "@/lib/auth";
import { listDocumentsForUser } from "@/lib/repositories/documentRepository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const activeUser = await getAuthenticatedUserFromCookies();
  if (!activeUser) {
    redirect("/login");
  }
  if (activeUser.approvalStatus !== "APPROVED") {
    return <PendingApprovalScreen user={activeUser} />;
  }

  const initialCollections = await listDocumentsForUser(activeUser.id);
  return <DashboardClient initialCollections={initialCollections} />;
}
