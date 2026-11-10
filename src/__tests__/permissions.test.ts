import { describe, expect, it } from "vitest";
import {
  canDeleteDocument,
  canEditDocument,
  canManageShares,
  canViewDocument,
  resolveDocumentAccess,
} from "@/lib/permissions";

describe("Document RBAC permissions", () => {
  const shares = [
    { userId: "user_sarah", permission: "EDIT" as const },
    { userId: "user_jordan", permission: "VIEW" as const },
  ];

  it("grants OWNER full rights to the document owner", () => {
    const role = resolveDocumentAccess("user_alex", "user_alex", shares);
    expect(role).toBe("OWNER");
    expect(canViewDocument(role)).toBe(true);
    expect(canEditDocument(role)).toBe(true);
    expect(canManageShares(role)).toBe(true);
    expect(canDeleteDocument(role)).toBe(true);
  });

  it("grants EDIT rights without share management or delete to editors", () => {
    const role = resolveDocumentAccess("user_alex", "user_sarah", shares);
    expect(role).toBe("EDIT");
    expect(canViewDocument(role)).toBe(true);
    expect(canEditDocument(role)).toBe(true);
    expect(canManageShares(role)).toBe(false);
    expect(canDeleteDocument(role)).toBe(false);
  });

  it("restricts VIEW collaborators to read-only access", () => {
    const role = resolveDocumentAccess("user_alex", "user_jordan", shares);
    expect(role).toBe("VIEW");
    expect(canViewDocument(role)).toBe(true);
    expect(canEditDocument(role)).toBe(false);
    expect(canManageShares(role)).toBe(false);
    expect(canDeleteDocument(role)).toBe(false);
  });

  it("returns null and denies all capabilities for unshared users", () => {
    const role = resolveDocumentAccess("user_alex", "user_outsider", shares);
    expect(role).toBeNull();
    expect(canViewDocument(role)).toBe(false);
    expect(canEditDocument(role)).toBe(false);
    expect(canManageShares(role)).toBe(false);
    expect(canDeleteDocument(role)).toBe(false);
  });
});

