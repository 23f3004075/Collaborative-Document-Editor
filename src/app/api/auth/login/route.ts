import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiResponse";
import { SESSION_COOKIE_NAME } from "@/lib/personas";
import { authenticateUser } from "@/lib/repositories/userRepository";
import { createSessionToken } from "@/lib/security";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { email, password } = loginSchema.parse(body);
    const user = await authenticateUser(email, password);
    const token = createSessionToken(user.id);

    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 14,
    });
    return response;
  } catch (error) {
    return handleApiError("POST /api/auth/login", error);
  }
}

