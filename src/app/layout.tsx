import type { Metadata } from "next";
import "./globals.css";
import { PersonaProvider } from "@/context/PersonaContext";
import { getActivePersonaIdFromCookies } from "@/lib/auth";
import { findSeededPersona, SEEDED_PERSONAS } from "@/lib/personas";

export const metadata: Metadata = {
  title: "Ajaia Docs — Lightweight Collaborative Document Editor",
  description:
    "AI-native collaborative document editor with rich text formatting, file ingestion, and role-based sharing.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activePersonaId = await getActivePersonaIdFromCookies();
  const initialUser = findSeededPersona(activePersonaId) ?? SEEDED_PERSONAS[0];

  return (
    <html lang="en">
      <body className="font-sans min-h-screen flex flex-col">
        <PersonaProvider
          initialUser={initialUser}
          personas={[...SEEDED_PERSONAS]}
        >
          {children}
        </PersonaProvider>
      </body>
    </html>
  );
}
