import { NextResponse } from "next/server";
import { getActivePersonaIdFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/apiResponse";
import { ValidationError } from "@/lib/errors";
import { addDocumentAttachment } from "@/lib/repositories/documentRepository";
import { validateAttachmentFile } from "@/lib/validation";

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
    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      throw new ValidationError("Please select a file to attach");
    }

    const validation = validateAttachmentFile(fileEntry.name, fileEntry.size);
    if (!validation.valid) {
      throw new ValidationError(validation.error);
    }

    const arrayBuffer = await fileEntry.arrayBuffer();
    const contentBase64 = Buffer.from(arrayBuffer).toString("base64");

    const attachment = await addDocumentAttachment(id, activeUserId, {
      fileName: fileEntry.name,
      mimeType: fileEntry.type || "application/octet-stream",
      fileSize: fileEntry.size,
      contentBase64,
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    return handleApiError("POST /api/documents/[id]/attachments", error);
  }
}

