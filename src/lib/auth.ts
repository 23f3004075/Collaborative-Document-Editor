import { cookies } from "next/headers";
import { ForbiddenError, UnauthorizedError } from "./errors";
import { SESSION_COOKIE_NAME } from "./personas";
import { findUserById } from "./repositories/userRepository";
import { verifySessionToken } from "./security";
import type { User } from "@/types/domain";

function extractCookieValue(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getAuthenticatedUserFromCookies(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const userId = verifySessionToken(token);
  if (!userId) return null;
  return findUserById(userId);
}

export async function requireApprovedUserFromRequest(
  request: Request
): Promise<User> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = extractCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  const userId = verifySessionToken(token);
  if (!userId) {
    throw new UnauthorizedError("Please sign in to continue");
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new UnauthorizedError("Session is no longer valid");
  }
  if (user.approvalStatus !== "APPROVED") {
    throw new ForbiddenError(
      user.approvalStatus === "PENDING"
        ? "Your account is awaiting admin approval"
        : "Your account access was not approved"
    );
  }
  return user;
}
