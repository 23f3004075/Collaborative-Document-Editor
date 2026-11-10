import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import {
  createSessionToken,
  hashPassword,
  verifyPassword,
  verifySessionToken,
} from "@/lib/security";

process.env.TURSO_DATABASE_URL = ":memory:";

describe("Authentication, Admin role assignment & approval workflow", () => {
  let userRepo: typeof import("@/lib/repositories/userRepository");
  let docRepo: typeof import("@/lib/repositories/documentRepository");
  let dbModule: typeof import("@/lib/db");

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    userRepo = await import("@/lib/repositories/userRepository");
    docRepo = await import("@/lib/repositories/documentRepository");
  });

  afterAll(() => {
    dbModule.closeDbClient();
  });

  it("hashes passwords with unique salts and verifies signed session tokens", () => {
    const hash1 = hashPassword("ajaia123");
    const hash2 = hashPassword("ajaia123");
    expect(hash1).not.toBe(hash2);
    expect(verifyPassword("ajaia123", hash1)).toBe(true);
    expect(verifyPassword("wrong-pass", hash1)).toBe(false);

    const token = createSessionToken("user_alex");
    expect(verifySessionToken(token)).toBe("user_alex");
    expect(verifySessionToken(`${token}tamper`)).toBeNull();
  });

  it("registers new users as PENDING and authenticates valid credentials", async () => {
    const created = await userRepo.registerUser({
      name: "Priya Nair",
      email: "priya@ajaia.io",
      roleTitle: "Staff Engineer",
      password: "secret123",
    });

    expect(created.systemRole).toBe("MEMBER");
    expect(created.approvalStatus).toBe("PENDING");

    const loggedIn = await userRepo.authenticateUser("priya@ajaia.io", "secret123");
    expect(loggedIn.id).toBe(created.id);

    await expect(
      userRepo.authenticateUser("priya@ajaia.io", "wrongpass")
    ).rejects.toThrow(UnauthorizedError);

    await expect(
      userRepo.registerUser({
        name: "Priya Duplicate",
        email: "priya@ajaia.io",
        roleTitle: "Engineer",
        password: "secret123",
      })
    ).rejects.toThrow(ConflictError);
  });

  it("allows Admin to approve members, assign Admin role, and blocks last-admin demotion", async () => {
    const newUser = await userRepo.registerUser({
      name: "Dev Member",
      email: "dev@ajaia.io",
      roleTitle: "Developer",
      password: "secret123",
    });

    // Pending user appears first in listAllUsers()
    const allUsers = await userRepo.listAllUsers();
    expect(allUsers[0]?.approvalStatus).toBe("PENDING");

    // Non-admin cannot approve or promote
    await expect(
      userRepo.adminUpdateUser("user_jordan", newUser.id, {
        approvalStatus: "APPROVED",
      })
    ).rejects.toThrow(ForbiddenError);

    // Lead Engineer (Admin) can reject and then approve new member
    const rejected = await userRepo.adminUpdateUser("user_alex", newUser.id, {
      approvalStatus: "REJECTED",
    });
    expect(rejected.approvalStatus).toBe("REJECTED");

    const approved = await userRepo.adminUpdateUser("user_alex", newUser.id, {
      approvalStatus: "APPROVED",
    });
    expect(approved.approvalStatus).toBe("APPROVED");

    // Promote Sarah to ADMIN
    const promoted = await userRepo.adminUpdateUser("user_alex", "user_sarah", {
      systemRole: "ADMIN",
    });
    expect(promoted.systemRole).toBe("ADMIN");

    // Demote Sarah back to MEMBER
    const demoted = await userRepo.adminUpdateUser("user_alex", "user_sarah", {
      systemRole: "MEMBER",
    });
    expect(demoted.systemRole).toBe("MEMBER");

    // Cannot demote the last remaining Admin (Alex)
    await expect(
      userRepo.adminUpdateUser("user_alex", "user_alex", {
        systemRole: "MEMBER",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("enforces document approval requests and Admin sign-off", async () => {
    const doc = await docRepo.createDocument("user_jordan", {
      title: "Architecture RFC",
      contentHtml: "<p>Proposal</p>",
      contentJson: "{}",
    });
    expect(doc.approvalStatus).toBe("DRAFT");

    const requested = await docRepo.updateDocumentApproval(
      doc.id,
      "user_jordan",
      "REQUEST"
    );
    expect(requested.approvalStatus).toBe("PENDING_APPROVAL");

    // Non-admin cannot approve
    await expect(
      docRepo.updateDocumentApproval(doc.id, "user_jordan", "APPROVE")
    ).rejects.toThrow(ForbiddenError);

    // Admin (Alex) approves
    const approved = await docRepo.updateDocumentApproval(
      doc.id,
      "user_alex",
      "APPROVE"
    );
    expect(approved.approvalStatus).toBe("APPROVED");
    expect(approved.reviewedBy).toBe("user_alex");
  });
});

