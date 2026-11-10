import type { DbRow } from "@/lib/db";
import type {
  DocumentApprovalStatus,
  DocumentAttachment,
  DocumentAttachmentWithData,
  DocumentRecord,
  DocumentShare,
  ShareRole,
  SystemRole,
  User,
  UserApprovalStatus,
} from "@/types/domain";

export function mapUserRow(row: DbRow): User {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    roleTitle: String(row.role_title),
    avatarColor: String(row.avatar_color),
    initials: String(row.initials),
    systemRole: (row.system_role ? String(row.system_role) : "MEMBER") as SystemRole,
    approvalStatus: (row.approval_status
      ? String(row.approval_status)
      : "APPROVED") as UserApprovalStatus,
  };
}

export function mapDocumentRow(row: DbRow): DocumentRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    contentHtml: String(row.content_html),
    contentJson: String(row.content_json),
    ownerId: String(row.owner_id),
    approvalStatus: (row.approval_status
      ? String(row.approval_status)
      : "DRAFT") as DocumentApprovalStatus,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapShareRow(row: DbRow, user?: User): DocumentShare {
  return {
    id: String(row.id),
    documentId: String(row.document_id),
    userId: String(row.user_id),
    permission: String(row.permission) as ShareRole,
    sharedAt: String(row.shared_at),
    user,
  };
}

export function mapAttachmentRow(row: DbRow): DocumentAttachment {
  return {
    id: String(row.id),
    documentId: String(row.document_id),
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    fileSize: Number(row.file_size),
    uploadedBy: String(row.uploaded_by),
    uploadedAt: String(row.uploaded_at),
  };
}

export function mapAttachmentWithDataRow(
  row: DbRow
): DocumentAttachmentWithData {
  return {
    ...mapAttachmentRow(row),
    contentBase64: String(row.content_base64),
  };
}
