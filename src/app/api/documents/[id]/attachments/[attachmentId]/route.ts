import { NextResponse } from "next/server";
import { getActivePersonaIdFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/apiResponse";
import {
  deleteDocumentAttachment,
  getAttachmentWithData,
} from "@/lib/repositories/documentRepository";

interface RouteContext {
  params: Promise<{ id: string; attachmentId: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id, attachmentId } = await context.params;
    const activeUserId = getActivePersonaIdFromRequest(request);
    const attachment = await getAttachmentWithData(id, attachmentId, activeUserId);
    const buffer = Buffer.from(attachment.contentBase64, "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (error) {
    return handleApiError(
      "GET /api/documents/[id]/attachments/[attachmentId]",
      error
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id, attachmentId } = await context.params;
    const activeUserId = getActivePersonaIdFromRequest(request);
    await deleteDocumentAttachment(id, attachmentId, activeUserId);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError(
      "DELETE /api/documents/[id]/attachments/[attachmentId]",
      error
    );
  }
}

