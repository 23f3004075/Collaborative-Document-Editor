import { NextResponse } from "next/server";
import { getActivePersonaIdFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/apiResponse";
import {
  deleteDocument,
  getDocumentById,
  updateDocument,
} from "@/lib/repositories/documentRepository";
import { updateDocumentSchema } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const activeUserId = getActivePersonaIdFromRequest(request);
    const document = await getDocumentById(id, activeUserId);
    return NextResponse.json({ document });
  } catch (error) {
    return handleApiError("GET /api/documents/[id]", error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const activeUserId = getActivePersonaIdFromRequest(request);
    const body: unknown = await request.json();
    const input = updateDocumentSchema.parse(body);
    const updated = await updateDocument(id, activeUserId, input);
    return NextResponse.json({ document: updated });
  } catch (error) {
    return handleApiError("PATCH /api/documents/[id]", error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const activeUserId = getActivePersonaIdFromRequest(request);
    await deleteDocument(id, activeUserId);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError("DELETE /api/documents/[id]", error);
  }
}

