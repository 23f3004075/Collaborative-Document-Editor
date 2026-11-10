import type { User } from "@/types/domain";

export const DEFAULT_PERSONA_ID = "user_alex";
export const PERSONA_COOKIE_NAME = "ajaia_persona_id";

export const SEEDED_PERSONAS: readonly User[] = [
  {
    id: "user_alex",
    name: "Alex Rivera",
    email: "alex@ajaia.io",
    roleTitle: "Engineering Lead",
    avatarColor: "bg-indigo-600",
    initials: "AR",
  },
  {
    id: "user_sarah",
    name: "Sarah Chen",
    email: "sarah@ajaia.io",
    roleTitle: "Product Manager",
    avatarColor: "bg-emerald-600",
    initials: "SC",
  },
  {
    id: "user_jordan",
    name: "Jordan Taylor",
    email: "jordan@ajaia.io",
    roleTitle: "UX Designer",
    avatarColor: "bg-amber-600",
    initials: "JT",
  },
] as const;

export function findSeededPersona(userId: string): User | undefined {
  return SEEDED_PERSONAS.find((persona) => persona.id === userId);
}

export function resolveValidPersonaId(candidateId?: string | null): string {
  if (candidateId && findSeededPersona(candidateId)) {
    return candidateId;
  }
  return DEFAULT_PERSONA_ID;
}

