import crypto from "node:crypto";
import { ensureDbInitialized } from "@/lib/db";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/security";
import type { SystemRole, User, UserApprovalStatus } from "@/types/domain";
import { mapUserRow } from "./mappers";

const AVATAR_COLORS = [
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-sky-600",
  "bg-violet-600",
] as const;

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export async function findUserById(userId: string): Promise<User | null> {
  const client = await ensureDbInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  return mapUserRow(result.rows[0]);
}

export async function listAllUsers(): Promise<User[]> {
  const client = await ensureDbInitialized();
  const result = await client.execute("SELECT * FROM users ORDER BY name ASC");
  return result.rows.map(mapUserRow);
}

export async function listApprovedUsers(): Promise<User[]> {
  const client = await ensureDbInitialized();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE approval_status = 'APPROVED' ORDER BY name ASC",
    args: [],
  });
  return result.rows.map(mapUserRow);
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<User> {
  const client = await ensureDbInitialized();
  const normalizedEmail = email.trim().toLowerCase();
  const result = await client.execute({
    sql: "SELECT * FROM users WHERE lower(email) = ?",
    args: [normalizedEmail],
  });

  if (result.rows.length === 0) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const row = result.rows[0];
  const storedHash = String(row.password_hash ?? "");
  if (!verifyPassword(password, storedHash)) {
    throw new UnauthorizedError("Invalid email or password");
  }

  return mapUserRow(row);
}

export async function registerUser(input: {
  name: string;
  email: string;
  roleTitle: string;
  password: string;
}): Promise<User> {
  const client = await ensureDbInitialized();
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await client.execute({
    sql: "SELECT id FROM users WHERE lower(email) = ?",
    args: [normalizedEmail],
  });

  if (existing.rows.length > 0) {
    throw new ConflictError("An account with this email already exists");
  }

  const id = `user_${crypto.randomUUID().slice(0, 10)}`;
  const initials = computeInitials(input.name);
  const avatarColor =
    AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const passwordHash = hashPassword(input.password);

  await client.execute({
    sql: `
      INSERT INTO users (
        id, name, email, role_title, avatar_color, initials,
        password_hash, system_role, approval_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'MEMBER', 'PENDING')
    `,
    args: [
      id,
      input.name.trim(),
      normalizedEmail,
      input.roleTitle.trim(),
      avatarColor,
      initials,
      passwordHash,
    ],
  });

  const created = await findUserById(id);
  if (!created) {
    throw new Error("Registered user could not be reloaded");
  }
  return created;
}

export async function requireAdminUser(userId: string): Promise<User> {
  const actor = await findUserById(userId);
  if (
    !actor ||
    actor.approvalStatus !== "APPROVED" ||
    actor.systemRole !== "ADMIN"
  ) {
    throw new ForbiddenError("Admin privileges are required for this action");
  }
  return actor;
}

export async function adminUpdateUser(
  adminUserId: string,
  targetUserId: string,
  updates: { systemRole?: SystemRole; approvalStatus?: UserApprovalStatus }
): Promise<User> {
  await requireAdminUser(adminUserId);
  const client = await ensureDbInitialized();
  const target = await findUserById(targetUserId);
  if (!target) {
    throw new NotFoundError("Target user was not found");
  }

  const nextRole = updates.systemRole ?? target.systemRole;
  const nextStatus = updates.approvalStatus ?? target.approvalStatus;

  const isRemovingAdmin =
    target.systemRole === "ADMIN" &&
    target.approvalStatus === "APPROVED" &&
    (nextRole !== "ADMIN" || nextStatus !== "APPROVED");

  if (isRemovingAdmin) {
    const adminsRes = await client.execute(
      "SELECT COUNT(*) as count FROM users WHERE system_role = 'ADMIN' AND approval_status = 'APPROVED'"
    );
    const adminCount = Number(adminsRes.rows[0]?.count ?? 0);
    if (adminCount <= 1) {
      throw new ValidationError(
        "At least one approved Admin must remain in the workspace"
      );
    }
  }

  await client.execute({
    sql: `UPDATE users SET system_role = ?, approval_status = ? WHERE id = ?`,
    args: [nextRole, nextStatus, targetUserId],
  });

  const updated = await findUserById(targetUserId);
  if (!updated) {
    throw new NotFoundError("Updated user record could not be loaded");
  }
  return updated;
}

