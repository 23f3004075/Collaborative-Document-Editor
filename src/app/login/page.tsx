import { redirect } from "next/navigation";
import { LoginClient } from "@/components/LoginClient";
import { getAuthenticatedUserFromCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const activeUser = await getAuthenticatedUserFromCookies();
  if (activeUser) {
    redirect("/");
  }

  return <LoginClient />;
}

