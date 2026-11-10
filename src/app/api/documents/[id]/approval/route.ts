import { NextResponse } from "next/server";
import { requireApprovedUserFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/apiResponse";
import { updateDocumentApproval } from "@/lib/repositories/documentRepository";
import { documentApprovalSchema } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const activeUser = await requireApprovedUserFromRequest(request);
    const { id } = await context.params;
    const body: unknown = await request.json();
    const { action } = documentApprovalSchema.parse(body);

    const updated = await updateDocumentApproval(id, activeUser.id, action);
    return NextResponse.json({ document: updated });
  } catch (error) {
    return handleApiError("POST /api/documents/[id]/approval", error);
  }
}

