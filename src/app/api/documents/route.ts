import { NextResponse } from "next/server";
import { requireApprovedUserFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/apiResponse";
import {
  createDocument,
  listDocumentsForUser,
} from "@/lib/repositories/documentRepository";
import { createDocumentSchema } from "@/lib/validation";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const activeUser = await requireApprovedUserFromRequest(request);
    const collections = await listDocumentsForUser(activeUser.id);
    return NextResponse.json({
      ...collections,
      activeUserId: activeUser.id,
    });
  } catch (error) {
    return handleApiError("GET /api/documents", error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const activeUser = await requireApprovedUserFromRequest(request);
    const body: unknown = await request.json();
    const input = createDocumentSchema.parse(body);
    const created = await createDocument(activeUser.id, input);
    return NextResponse.json({ document: created }, { status: 201 });
  } catch (error) {
    return handleApiError("POST /api/documents", error);
  }
}
