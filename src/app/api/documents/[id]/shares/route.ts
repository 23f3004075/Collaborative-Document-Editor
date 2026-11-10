import { NextResponse } from "next/server";
import { getActivePersonaIdFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/apiResponse";
import { ValidationError } from "@/lib/errors";
import {
  revokeDocumentShare,
  upsertDocumentShare,
} from "@/lib/repositories/documentRepository";
import { shareDocumentSchema } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const activeUserId = getActivePersonaIdFromRequest(request);
    const body: unknown = await request.json();
    const { targetUserId, permission } = shareDocumentSchema.parse(body);

    const updated = await upsertDocumentShare(
      id,
      activeUserId,
      targetUserId,
      permission
    );
    return NextResponse.json({ document: updated });
  } catch (error) {
    return handleApiError("POST /api/documents/[id]/shares", error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const activeUserId = getActivePersonaIdFromRequest(request);
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get("userId");

    if (!targetUserId) {
      throw new ValidationError("Query parameter 'userId' is required");
    }

    const updated = await revokeDocumentShare(id, activeUserId, targetUserId);
    return NextResponse.json({ document: updated });
  } catch (error) {
    return handleApiError("DELETE /api/documents/[id]/shares", error);
  }
}

