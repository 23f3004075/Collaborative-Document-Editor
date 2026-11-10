import { DashboardClient } from "@/components/DashboardClient";
import { getActivePersonaIdFromCookies } from "@/lib/auth";
import { listDocumentsForUser } from "@/lib/repositories/documentRepository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const activeUserId = await getActivePersonaIdFromCookies();
  const initialCollections = await listDocumentsForUser(activeUserId);

  return <DashboardClient initialCollections={initialCollections} />;
}

