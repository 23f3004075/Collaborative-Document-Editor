import { NextResponse } from "next/server";
import { getActivePersonaIdFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/apiResponse";
import {
  createDocument,
  listDocumentsForUser,
} from "@/lib/repositories/documentRepository";
import { createDocumentSchema } from "@/lib/validation";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const activeUserId = getActivePersonaIdFromRequest(request);
    const collections = await listDocumentsForUser(activeUserId);
    return NextResponse.json({
      ...collections,
      activeUserId,
    });
  } catch (error) {
    return handleApiError("GET /api/documents", error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const activeUserId = getActivePersonaIdFromRequest(request);
    const body: unknown = await request.json();
    const input = createDocumentSchema.parse(body);
    const created = await createDocument(activeUserId, input);
    return NextResponse.json({ document: created }, { status: 201 });
  } catch (error) {
    return handleApiError("POST /api/documents", error);
  }
}

