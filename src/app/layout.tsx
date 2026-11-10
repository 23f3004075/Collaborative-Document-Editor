import type { Metadata } from "next";
import "./globals.css";
import { PersonaProvider } from "@/context/PersonaContext";
import { getAuthenticatedUserFromCookies } from "@/lib/auth";
import { listApprovedUsers } from "@/lib/repositories/userRepository";

export const metadata: Metadata = {
  title: "Ajaia Docs — Lightweight Collaborative Document Editor",
  description:
    "AI-native collaborative document editor with rich text formatting, file ingestion, login, admin approvals, and role-based sharing.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [initialUser, approvedUsers] = await Promise.all([
    getAuthenticatedUserFromCookies(),
    listApprovedUsers(),
  ]);

  return (
    <html lang="en">
      <body className="font-sans min-h-screen flex flex-col">
        <PersonaProvider initialUser={initialUser} personas={approvedUsers}>
          {children}
        </PersonaProvider>
      </body>
    </html>
  );
}
