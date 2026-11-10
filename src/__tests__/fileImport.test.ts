import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/errors";
import { parseImportedFileContent } from "@/lib/fileImport";
import { MAX_IMPORT_FILE_BYTES } from "@/lib/validation";

describe("File import parser", () => {
  it("parses markdown with leading H1 into title and rich HTML body", () => {
    const markdown = "# Launch Checklist\n\n- **Item 1**\n- *Item 2*\n";
    const result = parseImportedFileContent(
      "launch.md",
      Buffer.byteLength(markdown),
      markdown
    );

    expect(result.title).toBe("Launch Checklist");
    expect(result.contentHtml).toContain("<ul>");
    expect(result.contentHtml).toContain("<strong>Item 1</strong>");
    expect(result.contentHtml).toContain("<em>Item 2</em>");
  });

  it("falls back to filename and converts plain text paragraphs safely", () => {
    const text = "First line & <script>alert(1)</script>\nSecond line\n\nNew paragraph";
    const result = parseImportedFileContent(
      "meeting-notes.txt",
      Buffer.byteLength(text),
      text
    );

    expect(result.title).toBe("meeting-notes");
    expect(result.contentHtml).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(result.contentHtml).toContain("<br />");
    expect(result.contentHtml).toContain("<p>New paragraph</p>");
  });

  it("strips dangerous script tags from imported markdown HTML", () => {
    const md = "# Safe Title\n\nHello <script>evil()</script> world";
    const result = parseImportedFileContent("evil.md", 100, md);
    expect(result.contentHtml).not.toContain("<script>");
  });

  it("rejects unsupported file extensions and oversized files", () => {
    expect(() =>
      parseImportedFileContent("spec.docx", 512, "content")
    ).toThrow(ValidationError);

    expect(() =>
      parseImportedFileContent("huge.md", MAX_IMPORT_FILE_BYTES + 1, "# Huge")
    ).toThrow(ValidationError);
  });
});

