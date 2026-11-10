import type { DocumentShare, PermissionLevel } from "@/types/domain";

export function resolveDocumentAccess(
  ownerId: string,
  activeUserId: string,
  shares: readonly Pick<DocumentShare, "userId" | "permission">[]
): PermissionLevel | null {
  if (!ownerId || !activeUserId) {
    return null;
  }
  if (ownerId === activeUserId) {
    return "OWNER";
  }
  const match = shares.find((share) => share.userId === activeUserId);
  return match ? match.permission : null;
}

export function canViewDocument(role: PermissionLevel | null): boolean {
  return role === "OWNER" || role === "EDIT" || role === "VIEW";
}

export function canEditDocument(role: PermissionLevel | null): boolean {
  return role === "OWNER" || role === "EDIT";
}

export function canManageShares(role: PermissionLevel | null): boolean {
  return role === "OWNER";
}

export function canDeleteDocument(role: PermissionLevel | null): boolean {
  return role === "OWNER";
}

