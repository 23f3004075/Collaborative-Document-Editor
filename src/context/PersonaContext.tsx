"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types/domain";

interface PersonaContextValue {
  activeUser: User;
  personas: User[];
  isSwitching: boolean;
  switchPersona: (userId: string) => Promise<void>;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

interface PersonaProviderProps {
  initialUser: User;
  personas: User[];
  children: React.ReactNode;
}

export function PersonaProvider({
  initialUser,
  personas,
  children,
}: PersonaProviderProps) {
  const router = useRouter();
  const [activeUser, setActiveUser] = useState<User>(initialUser);
  const [isSwitching, setIsSwitching] = useState(false);

  const switchPersona = useCallback(
    async (userId: string) => {
      if (userId === activeUser.id) return;
      setIsSwitching(true);
      try {
        const res = await fetch("/api/persona", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        if (!res.ok) {
          throw new Error("Failed to switch persona");
        }
        const data = (await res.json()) as { activeUser: User };
        setActiveUser(data.activeUser);
        router.refresh();
      } finally {
        setIsSwitching(false);
      }
    },
    [activeUser.id, router]
  );

  return (
    <PersonaContext.Provider
      value={{ activeUser, personas, isSwitching, switchPersona }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) {
    throw new Error("usePersona must be used inside a PersonaProvider");
  }
  return ctx;
}

