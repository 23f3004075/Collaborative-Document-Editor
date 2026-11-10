import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserFromCookies } from "@/lib/auth";
import { handleApiError } from "@/lib/apiResponse";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { SESSION_COOKIE_NAME, findSeededPersona } from "@/lib/personas";
import {
  findUserById,
  listApprovedUsers,
} from "@/lib/repositories/userRepository";
import { createSessionToken } from "@/lib/security";

const switchPersonaSchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
});

export async function GET(): Promise<NextResponse> {
  try {
    const activeUser = await getAuthenticatedUserFromCookies();
    const personas = await listApprovedUsers();
    return NextResponse.json({
      activeUser,
      personas,
    });
  } catch (error) {
    return handleApiError("GET /api/persona", error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { userId } = switchPersonaSchema.parse(body);

    const seeded = findSeededPersona(userId);
    if (!seeded) {
      throw new ValidationError("Quick switch is only available for demo accounts");
    }

    const dbUser = await findUserById(userId);
    if (!dbUser || dbUser.approvalStatus !== "APPROVED") {
      throw new ForbiddenError("Selected demo account is not approved");
    }

    const token = createSessionToken(dbUser.id);
    const response = NextResponse.json({ activeUser: dbUser });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 14,
    });
    return response;
  } catch (error) {
    return handleApiError("POST /api/persona", error);
  }
}
