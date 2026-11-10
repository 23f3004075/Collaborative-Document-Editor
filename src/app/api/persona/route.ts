import { NextResponse } from "next/server";
import { z } from "zod";
import { getActivePersonaIdFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/apiResponse";
import {
  PERSONA_COOKIE_NAME,
  SEEDED_PERSONAS,
  findSeededPersona,
} from "@/lib/personas";
import { ValidationError } from "@/lib/errors";

const switchPersonaSchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
});

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const activeUserId = getActivePersonaIdFromRequest(request);
    const activeUser = findSeededPersona(activeUserId);
    return NextResponse.json({
      activeUser,
      personas: SEEDED_PERSONAS,
    });
  } catch (error) {
    return handleApiError("GET /api/persona", error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { userId } = switchPersonaSchema.parse(body);
    const persona = findSeededPersona(userId);
    if (!persona) {
      throw new ValidationError("Unknown persona ID selected");
    }

    const response = NextResponse.json({ activeUser: persona });
    response.cookies.set(PERSONA_COOKIE_NAME, persona.id, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    return handleApiError("POST /api/persona", error);
  }
}

