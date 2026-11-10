import { NextResponse } from "next/server";
import { requireApprovedUserFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/apiResponse";
import { adminUpdateUser } from "@/lib/repositories/userRepository";
import { adminUpdateUserSchema } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function PATCH(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const activeUser = await requireApprovedUserFromRequest(request);
    const { userId } = await context.params;
    const body: unknown = await request.json();
    const updates = adminUpdateUserSchema.parse(body);

    const updated = await adminUpdateUser(activeUser.id, userId, updates);
    return NextResponse.json({ user: updated });
  } catch (error) {
    return handleApiError("PATCH /api/admin/users/[userId]", error);
  }
}

