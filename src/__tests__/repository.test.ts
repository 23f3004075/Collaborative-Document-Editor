import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/lib/errors";

process.env.TURSO_DATABASE_URL = ":memory:";

describe("Document repository persistence & sharing integration", () => {
  let repo: typeof import("@/lib/repositories/documentRepository");
  let dbModule: typeof import("@/lib/db");

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    repo = await import("@/lib/repositories/documentRepository");
  });

  afterAll(() => {
    dbModule.closeDbClient();
  });

  it("creates, shares, enforces VIEW vs EDIT access, and revokes access", async () => {
    const created = await repo.createDocument("user_alex", {
      title: "Integration Test Doc",
      contentHtml: "<p>Initial body</p>",
      contentJson: "{}",
    });

    expect(created.ownerId).toBe("user_alex");
    expect(created.accessRole).toBe("OWNER");

    // Share with Sarah as VIEW
    await repo.upsertDocumentShare(created.id, "user_alex", "user_sarah", "VIEW");

    // Verify Sarah sees it under 'shared'
    const sarahCollections = await repo.listDocumentsForUser("user_sarah");
    const sharedEntry = sarahCollections.shared.find((d) => d.id === created.id);
    expect(sharedEntry).toBeDefined();
    expect(sharedEntry?.accessRole).toBe("VIEW");

    // Viewer cannot update content
    await expect(
      repo.updateDocument(created.id, "user_sarah", {
        contentHtml: "<p>Tampered</p>",
      })
    ).rejects.toThrow(ForbiddenError);

    // Upgrade Sarah to EDIT
    await repo.upsertDocumentShare(created.id, "user_alex", "user_sarah", "EDIT");
    const edited = await repo.updateDocument(created.id, "user_sarah", {
      title: "Updated by Sarah",
      contentHtml: "<p>Collaborative edit</p>",
    });
    expect(edited.title).toBe("Updated by Sarah");
    expect(edited.contentHtml).toBe("<p>Collaborative edit</p>");

    // Editor cannot delete or manage shares
    await expect(repo.deleteDocument(created.id, "user_sarah")).rejects.toThrow(
      ForbiddenError
    );
    await expect(
      repo.upsertDocumentShare(created.id, "user_sarah", "user_jordan", "VIEW")
    ).rejects.toThrow(ForbiddenError);

    // Owner revokes access -> Sarah can no longer read it
    await repo.revokeDocumentShare(created.id, "user_alex", "user_sarah");
    await expect(
      repo.getDocumentById(created.id, "user_sarah")
    ).rejects.toThrow(ForbiddenError);
  });

  it("persists document attachments and restricts viewer uploads", async () => {
    const doc = await repo.createDocument("user_alex", {
      title: "Attachment Spec",
      contentHtml: "<p>See attachment</p>",
      contentJson: "{}",
    });
    await repo.upsertDocumentShare(doc.id, "user_alex", "user_jordan", "VIEW");

    // Viewer cannot attach files
    await expect(
      repo.addDocumentAttachment(doc.id, "user_jordan", {
        fileName: "notes.txt",
        mimeType: "text/plain",
        fileSize: 5,
        contentBase64: Buffer.from("hello").toString("base64"),
      })
    ).rejects.toThrow(ForbiddenError);

    // Owner can attach and Viewer can download
    const attachment = await repo.addDocumentAttachment(doc.id, "user_alex", {
      fileName: "spec.txt",
      mimeType: "text/plain",
      fileSize: 5,
      contentBase64: Buffer.from("hello").toString("base64"),
    });

    const fetched = await repo.getAttachmentWithData(
      doc.id,
      attachment.id,
      "user_jordan"
    );
    expect(fetched.fileName).toBe("spec.txt");
    expect(Buffer.from(fetched.contentBase64, "base64").toString("utf8")).toBe(
      "hello"
    );
  });
});
