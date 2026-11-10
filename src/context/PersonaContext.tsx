"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types/domain";

interface PersonaContextValue {
  activeUser: User | null;
  personas: User[];
  isSwitching: boolean;
  setActiveUser: (user: User | null) => void;
  switchPersona: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

interface PersonaProviderProps {
  initialUser: User | null;
  personas: User[];
  children: React.ReactNode;
}

export function PersonaProvider({
  initialUser,
  personas,
  children,
}: PersonaProviderProps) {
  const router = useRouter();
  const [activeUser, setActiveUser] = useState<User | null>(initialUser);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    setActiveUser(initialUser);
  }, [initialUser]);

  const switchPersona = useCallback(
    async (userId: string) => {
      if (userId === activeUser?.id) return;
      setIsSwitching(true);
      try {
        const res = await fetch("/api/persona", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        if (!res.ok) {
          throw new Error("Failed to switch account");
        }
        const data = (await res.json()) as { activeUser: User };
        setActiveUser(data.activeUser);
        router.refresh();
      } finally {
        setIsSwitching(false);
      }
    },
    [activeUser?.id, router]
  );

  const logout = useCallback(async () => {
    setIsSwitching(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setActiveUser(null);
      router.push("/login");
      router.refresh();
    } finally {
      setIsSwitching(false);
    }
  }, [router]);

  return (
    <PersonaContext.Provider
      value={{
        activeUser,
        personas,
        isSwitching,
        setActiveUser,
        switchPersona,
        logout,
      }}
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
