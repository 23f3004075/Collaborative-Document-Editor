import crypto from "node:crypto";
import { type DbClient, ensureDbInitialized } from "@/lib/db";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import {
  canDeleteDocument,
  canEditDocument,
  canManageShares,
  canViewDocument,
  resolveDocumentAccess,
} from "@/lib/permissions";
import type {
  DocumentAttachment,
  DocumentAttachmentWithData,
  DocumentDetail,
  DocumentShare,
  DocumentWithAccess,
  ShareRole,
  User,
  UserDocumentCollections,
} from "@/types/domain";
import {
  mapAttachmentRow,
  mapAttachmentWithDataRow,
  mapDocumentRow,
  mapShareRow,
  mapUserRow,
} from "./mappers";
import { findUserById, requireAdminUser } from "./userRepository";

async function loadUsersMap(client: DbClient): Promise<Map<string, User>> {
  const result = await client.execute("SELECT * FROM users ORDER BY name ASC");
  const map = new Map<string, User>();
  for (const row of result.rows) {
    const user = mapUserRow(row);
    map.set(user.id, user);
  }
  return map;
}

async function loadSharesForDocuments(
  client: DbClient,
  docIds: string[],
  usersMap: Map<string, User>
): Promise<Map<string, DocumentShare[]>> {
  const sharesMap = new Map<string, DocumentShare[]>();
  if (docIds.length === 0) {
    return sharesMap;
  }
  const placeholders = docIds.map(() => "?").join(",");
  const result = await client.execute({
    sql: `SELECT * FROM document_shares WHERE document_id IN (${placeholders}) ORDER BY shared_at DESC`,
    args: docIds,
  });
  for (const row of result.rows) {
    const share = mapShareRow(row, usersMap.get(String(row.user_id)));
    const list = sharesMap.get(share.documentId) ?? [];
    list.push(share);
    sharesMap.set(share.documentId, list);
  }
  return sharesMap;
}

async function loadAttachmentCounts(
  client: DbClient,
  docIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (docIds.length === 0) {
    return counts;
  }
  const placeholders = docIds.map(() => "?").join(",");
  const result = await client.execute({
    sql: `SELECT document_id, COUNT(*) as count FROM attachments WHERE document_id IN (${placeholders}) GROUP BY document_id`,
    args: docIds,
  });
  for (const row of result.rows) {
    counts.set(String(row.document_id), Number(row.count));
  }
  return counts;
}

export async function listUsers(): Promise<User[]> {
  const client = await ensureDbInitialized();
  const result = await client.execute("SELECT * FROM users ORDER BY name ASC");
  return result.rows.map(mapUserRow);
}

export async function listDocumentsForUser(
  activeUserId: string
): Promise<UserDocumentCollections> {
  const client = await ensureDbInitialized();
  const usersMap = await loadUsersMap(client);
  const docsResult = await client.execute({
    sql: `
      SELECT DISTINCT d.*
      FROM documents d
      LEFT JOIN document_shares ds ON ds.document_id = d.id
      WHERE d.owner_id = ? OR ds.user_id = ?
      ORDER BY d.updated_at DESC
    `,
    args: [activeUserId, activeUserId],
  });

  const docs = docsResult.rows.map(mapDocumentRow);
  const docIds = docs.map((d) => d.id);
  const [sharesMap, attachmentCounts] = await Promise.all([
    loadSharesForDocuments(client, docIds, usersMap),
    loadAttachmentCounts(client, docIds),
  ]);

  const owned: DocumentWithAccess[] = [];
  const shared: DocumentWithAccess[] = [];

  for (const doc of docs) {
    const shares = sharesMap.get(doc.id) ?? [];
    const role = resolveDocumentAccess(doc.ownerId, activeUserId, shares);
    if (!role) continue;
    const owner = usersMap.get(doc.ownerId);
    if (!owner) continue;

    const item: DocumentWithAccess = {
      ...doc,
      owner,
      accessRole: role,
      shares,
      attachmentCount: attachmentCounts.get(doc.id) ?? 0,
    };

    if (role === "OWNER") {
      owned.push(item);
    } else {
      shared.push(item);
    }
  }

  return { owned, shared };
}

async function fetchRawDocumentAndShares(
  client: DbClient,
  docId: string
): Promise<{
  doc: ReturnType<typeof mapDocumentRow>;
  shares: DocumentShare[];
  usersMap: Map<string, User>;
}> {
  const docResult = await client.execute({
    sql: "SELECT * FROM documents WHERE id = ?",
    args: [docId],
  });
  if (docResult.rows.length === 0) {
    throw new NotFoundError("Document not found");
  }
  const doc = mapDocumentRow(docResult.rows[0]);
  const usersMap = await loadUsersMap(client);
  const sharesMap = await loadSharesForDocuments(client, [docId], usersMap);
  return { doc, shares: sharesMap.get(docId) ?? [], usersMap };
}

export async function getDocumentById(
  docId: string,
  activeUserId: string
): Promise<DocumentDetail> {
  const client = await ensureDbInitialized();
  const { doc, shares, usersMap } = await fetchRawDocumentAndShares(client, docId);
  const directRole = resolveDocumentAccess(doc.ownerId, activeUserId, shares);
  const activeUser = usersMap.get(activeUserId);
  const isAdminReviewingPending =
    !directRole &&
    activeUser?.systemRole === "ADMIN" &&
    activeUser.approvalStatus === "APPROVED" &&
    doc.approvalStatus === "PENDING_APPROVAL";
  const role = directRole ?? (isAdminReviewingPending ? "VIEW" : null);

  if (!canViewDocument(role) || !role) {
    throw new ForbiddenError("You do not have access to view this document");
  }

  const owner = usersMap.get(doc.ownerId);
  if (!owner) {
    throw new NotFoundError("Document owner record could not be located");
  }

  const attResult = await client.execute({
    sql: `SELECT id, document_id, file_name, mime_type, file_size, uploaded_by, uploaded_at
          FROM attachments WHERE document_id = ? ORDER BY uploaded_at DESC`,
    args: [docId],
  });
  const attachments = attResult.rows.map(mapAttachmentRow);

  return {
    ...doc,
    owner,
    accessRole: role,
    shares,
    attachmentCount: attachments.length,
    attachments,
  };
}

export async function createDocument(
  ownerId: string,
  input: { title: string; contentHtml: string; contentJson: string }
): Promise<DocumentDetail> {
  const client = await ensureDbInitialized();
  const id = `doc_${crypto.randomUUID().slice(0, 12)}`;
  const now = new Date().toISOString();

  await client.execute({
    sql: `
      INSERT INTO documents (
        id, title, content_html, content_json, owner_id,
        approval_status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?)
    `,
    args: [id, input.title, input.contentHtml, input.contentJson, ownerId, now, now],
  });

  return getDocumentById(id, ownerId);
}

export async function updateDocument(
  docId: string,
  activeUserId: string,
  input: { title?: string; contentHtml?: string; contentJson?: string }
): Promise<DocumentDetail> {
  const client = await ensureDbInitialized();
  const { doc, shares } = await fetchRawDocumentAndShares(client, docId);
  const role = resolveDocumentAccess(doc.ownerId, activeUserId, shares);

  if (!canEditDocument(role)) {
    throw new ForbiddenError("You only have view access to this document");
  }

  const nextTitle = input.title ?? doc.title;
  const nextHtml = input.contentHtml ?? doc.contentHtml;
  const nextJson = input.contentJson ?? doc.contentJson;
  const now = new Date().toISOString();

  await client.execute({
    sql: `
      UPDATE documents
      SET title = ?, content_html = ?, content_json = ?, updated_at = ?
      WHERE id = ?
    `,
    args: [nextTitle, nextHtml, nextJson, now, docId],
  });

  return getDocumentById(docId, activeUserId);
}

export async function deleteDocument(
  docId: string,
  activeUserId: string
): Promise<void> {
  const client = await ensureDbInitialized();
  const { doc, shares } = await fetchRawDocumentAndShares(client, docId);
  const role = resolveDocumentAccess(doc.ownerId, activeUserId, shares);

  if (!canDeleteDocument(role)) {
    throw new ForbiddenError("Only the document owner can delete this document");
  }

  await client.execute({
    sql: "DELETE FROM documents WHERE id = ?",
    args: [docId],
  });
}

export async function upsertDocumentShare(
  docId: string,
  activeUserId: string,
  targetUserId: string,
  permission: ShareRole
): Promise<DocumentDetail> {
  const client = await ensureDbInitialized();
  const { doc, shares, usersMap } = await fetchRawDocumentAndShares(client, docId);
  const role = resolveDocumentAccess(doc.ownerId, activeUserId, shares);

  if (!canManageShares(role)) {
    throw new ForbiddenError("Only the document owner can manage sharing settings");
  }
  if (targetUserId === doc.ownerId) {
    throw new ValidationError("Cannot add the document owner as a collaborator");
  }
  if (!usersMap.has(targetUserId)) {
    throw new NotFoundError("Target collaborator user does not exist");
  }

  const id = `share_${crypto.randomUUID().slice(0, 12)}`;
  const now = new Date().toISOString();

  await client.execute({
    sql: `
      INSERT INTO document_shares (id, document_id, user_id, permission, shared_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(document_id, user_id) DO UPDATE SET
        permission = excluded.permission,
        shared_at = excluded.shared_at
    `,
    args: [id, docId, targetUserId, permission, now],
  });

  return getDocumentById(docId, activeUserId);
}

export async function revokeDocumentShare(
  docId: string,
  activeUserId: string,
  targetUserId: string
): Promise<DocumentDetail> {
  const client = await ensureDbInitialized();
  const { doc, shares } = await fetchRawDocumentAndShares(client, docId);
  const role = resolveDocumentAccess(doc.ownerId, activeUserId, shares);

  if (!canManageShares(role)) {
    throw new ForbiddenError("Only the document owner can revoke access");
  }

  await client.execute({
    sql: "DELETE FROM document_shares WHERE document_id = ? AND user_id = ?",
    args: [docId, targetUserId],
  });

  return getDocumentById(docId, activeUserId);
}

export async function addDocumentAttachment(
  docId: string,
  activeUserId: string,
  input: {
    fileName: string;
    mimeType: string;
    fileSize: number;
    contentBase64: string;
  }
): Promise<DocumentAttachment> {
  const client = await ensureDbInitialized();
  const { doc, shares } = await fetchRawDocumentAndShares(client, docId);
  const role = resolveDocumentAccess(doc.ownerId, activeUserId, shares);

  if (!canEditDocument(role)) {
    throw new ForbiddenError("Viewers cannot upload attachments to this document");
  }

  const id = `att_${crypto.randomUUID().slice(0, 12)}`;
  const now = new Date().toISOString();

  await client.execute({
    sql: `
      INSERT INTO attachments (id, document_id, file_name, mime_type, file_size, content_base64, uploaded_by, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      docId,
      input.fileName,
      input.mimeType,
      input.fileSize,
      input.contentBase64,
      activeUserId,
      now,
    ],
  });

  return {
    id,
    documentId: docId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    uploadedBy: activeUserId,
    uploadedAt: now,
  };
}

export async function getAttachmentWithData(
  docId: string,
  attachmentId: string,
  activeUserId: string
): Promise<DocumentAttachmentWithData> {
  const client = await ensureDbInitialized();
  const { doc, shares } = await fetchRawDocumentAndShares(client, docId);
  const role = resolveDocumentAccess(doc.ownerId, activeUserId, shares);

  if (!canViewDocument(role)) {
    throw new ForbiddenError("You do not have access to download this attachment");
  }

  const result = await client.execute({
    sql: "SELECT * FROM attachments WHERE id = ? AND document_id = ?",
    args: [attachmentId, docId],
  });
  if (result.rows.length === 0) {
    throw new NotFoundError("Attachment not found");
  }
  return mapAttachmentWithDataRow(result.rows[0]);
}

export async function deleteDocumentAttachment(
  docId: string,
  attachmentId: string,
  activeUserId: string
): Promise<void> {
  const client = await ensureDbInitialized();
  const { doc, shares } = await fetchRawDocumentAndShares(client, docId);
  const role = resolveDocumentAccess(doc.ownerId, activeUserId, shares);

  if (!canEditDocument(role)) {
    throw new ForbiddenError("Viewers cannot remove attachments from this document");
  }

  await client.execute({
    sql: "DELETE FROM attachments WHERE id = ? AND document_id = ?",
    args: [attachmentId, docId],
  });
}

export async function updateDocumentApproval(
  docId: string,
  activeUserId: string,
  action: "REQUEST" | "APPROVE" | "REJECT"
): Promise<DocumentDetail> {
  const client = await ensureDbInitialized();
  const { doc, shares } = await fetchRawDocumentAndShares(client, docId);
  const now = new Date().toISOString();

  if (action === "REQUEST") {
    const role = resolveDocumentAccess(doc.ownerId, activeUserId, shares);
    if (!canEditDocument(role)) {
      throw new ForbiddenError("Only owners or editors can request approval");
    }
    await client.execute({
      sql: `
        UPDATE documents
        SET approval_status = 'PENDING_APPROVAL', reviewed_by = NULL, reviewed_at = NULL, updated_at = ?
        WHERE id = ?
      `,
      args: [now, docId],
    });
    return getDocumentById(docId, activeUserId);
  }

  await requireAdminUser(activeUserId);
  const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
  await client.execute({
    sql: `
      UPDATE documents
      SET approval_status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
      WHERE id = ?
    `,
    args: [nextStatus, activeUserId, now, now, docId],
  });

  const actor = await findUserById(activeUserId);
  const role = resolveDocumentAccess(doc.ownerId, activeUserId, shares);
  if (role) {
    return getDocumentById(docId, activeUserId);
  }

  const usersMap = await loadUsersMap(client);
  const owner = usersMap.get(doc.ownerId) ?? actor!;
  const updatedDoc = await fetchRawDocumentAndShares(client, docId);
  return {
    ...updatedDoc.doc,
    owner,
    accessRole: "VIEW",
    shares: updatedDoc.shares,
    attachmentCount: 0,
    attachments: [],
  };
}

export async function listAllDocumentsForAdmin(
  adminUserId: string
): Promise<DocumentWithAccess[]> {
  await requireAdminUser(adminUserId);
  const client = await ensureDbInitialized();
  const usersMap = await loadUsersMap(client);
  const docsResult = await client.execute(`
    SELECT * FROM documents
    ORDER BY
      CASE approval_status
        WHEN 'PENDING_APPROVAL' THEN 0
        WHEN 'REJECTED' THEN 1
        WHEN 'DRAFT' THEN 2
        ELSE 3
      END,
      updated_at DESC
  `);

  const docs = docsResult.rows.map(mapDocumentRow);
  const docIds = docs.map((d) => d.id);
  const [sharesMap, attachmentCounts] = await Promise.all([
    loadSharesForDocuments(client, docIds, usersMap),
    loadAttachmentCounts(client, docIds),
  ]);

  const items: DocumentWithAccess[] = [];
  for (const doc of docs) {
    const owner = usersMap.get(doc.ownerId);
    if (!owner) continue;
    const shares = sharesMap.get(doc.id) ?? [];
    items.push({
      ...doc,
      owner,
      accessRole:
        resolveDocumentAccess(doc.ownerId, adminUserId, shares) ?? "VIEW",
      shares,
      attachmentCount: attachmentCounts.get(doc.id) ?? 0,
    });
  }
  return items;
}

