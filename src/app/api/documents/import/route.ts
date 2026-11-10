import { NextResponse } from "next/server";
import { getActivePersonaIdFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/apiResponse";
import { ValidationError } from "@/lib/errors";
import { parseImportedFileContent } from "@/lib/fileImport";
import { createDocument } from "@/lib/repositories/documentRepository";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const activeUserId = getActivePersonaIdFromRequest(request);
    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      throw new ValidationError("Please select a .txt or .md file to import");
    }

    const rawText = await fileEntry.text();
    const parsed = parseImportedFileContent(
      fileEntry.name,
      fileEntry.size,
      rawText
    );

    const created = await createDocument(activeUserId, {
      title: parsed.title,
      contentHtml: parsed.contentHtml,
      contentJson: "{}",
    });

    return NextResponse.json({ document: created }, { status: 201 });
  } catch (error) {
    return handleApiError("POST /api/documents/import", error);
  }
}

