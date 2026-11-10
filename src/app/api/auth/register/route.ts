import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiResponse";
import { SESSION_COOKIE_NAME } from "@/lib/personas";
import { registerUser } from "@/lib/repositories/userRepository";
import { createSessionToken } from "@/lib/security";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const input = registerSchema.parse(body);
    const user = await registerUser(input);
    const token = createSessionToken(user.id);

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 14,
    });
    return response;
  } catch (error) {
    return handleApiError("POST /api/auth/register", error);
  }
}

