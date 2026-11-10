import { z } from "zod";

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2 MB

export const SUPPORTED_IMPORT_EXTENSIONS = [".txt", ".md"] as const;
export const SUPPORTED_ATTACHMENT_EXTENSIONS = [
  ".txt",
  ".md",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".csv",
  ".json",
] as const;

export const createDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Document title cannot be empty")
    .max(180, "Document title must be 180 characters or fewer")
    .default("Untitled Document"),
  contentHtml: z.string().default("<p></p>"),
  contentJson: z.string().default("{}"),
});

export const updateDocumentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Document title cannot be empty")
      .max(180, "Document title must be 180 characters or fewer")
      .optional(),
    contentHtml: z.string().optional(),
    contentJson: z.string().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.contentHtml !== undefined ||
      data.contentJson !== undefined,
    { message: "At least one field must be provided to update a document" }
  );

export const shareDocumentSchema = z.object({
  targetUserId: z.string().trim().min(1, "Target user ID is required"),
  permission: z.enum(["EDIT", "VIEW"]),
});

export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot).toLowerCase();
}

export function validateImportFile(
  fileName: string,
  fileSize: number
): { valid: true } | { valid: false; error: string } {
  const ext = getFileExtension(fileName);
  if (!SUPPORTED_IMPORT_EXTENSIONS.includes(ext as ".txt" | ".md")) {
    return {
      valid: false,
      error: `Unsupported file type "${ext || "unknown"}". Only .txt and .md files can be imported as documents.`,
    };
  }
  if (fileSize <= 0) {
    return { valid: false, error: "File is empty." };
  }
  if (fileSize > MAX_IMPORT_FILE_BYTES) {
    return {
      valid: false,
      error: "File exceeds the 5 MB limit for document import.",
    };
  }
  return { valid: true };
}

export function validateAttachmentFile(
  fileName: string,
  fileSize: number
): { valid: true } | { valid: false; error: string } {
  const ext = getFileExtension(fileName);
  if (
    !SUPPORTED_ATTACHMENT_EXTENSIONS.includes(
      ext as (typeof SUPPORTED_ATTACHMENT_EXTENSIONS)[number]
    )
  ) {
    return {
      valid: false,
      error: `Unsupported attachment type "${ext || "unknown"}". Supported formats: ${SUPPORTED_ATTACHMENT_EXTENSIONS.join(", ")}.`,
    };
  }
  if (fileSize <= 0) {
    return { valid: false, error: "Attachment file is empty." };
  }
  if (fileSize > MAX_ATTACHMENT_BYTES) {
    return {
      valid: false,
      error: "Attachment exceeds the 2 MB size limit.",
    };
  }
  return { valid: true };
}

