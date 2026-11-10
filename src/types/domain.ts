export type ShareRole = "EDIT" | "VIEW";
export type PermissionLevel = "OWNER" | ShareRole;

export interface User {
  id: string;
  name: string;
  email: string;
  roleTitle: string;
  avatarColor: string;
  initials: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  contentHtml: string;
  contentJson: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentShare {
  id: string;
  documentId: string;
  userId: string;
  permission: ShareRole;
  sharedAt: string;
  user?: User;
}

export interface DocumentAttachment {
  id: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface DocumentAttachmentWithData extends DocumentAttachment {
  contentBase64: string;
}

export interface DocumentWithAccess extends DocumentRecord {
  owner: User;
  accessRole: PermissionLevel;
  shares: DocumentShare[];
  attachmentCount: number;
}

export interface DocumentDetail extends DocumentWithAccess {
  attachments: DocumentAttachment[];
}

export interface UserDocumentCollections {
  owned: DocumentWithAccess[];
  shared: DocumentWithAccess[];
}

