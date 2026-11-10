import { marked } from "marked";
import { getFileExtension, validateImportFile } from "./validation";
import { ValidationError } from "./errors";

export interface ParsedImportedDocument {
  title: string;
  contentHtml: string;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function deriveTitleFromFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, "").trim();
  return withoutExt.length > 0 ? withoutExt : "Imported Document";
}

function plainTextToHtml(rawText: string): string {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return "<p></p>";
  }
  const paragraphs = normalized.split(/\n{2,}/);
  return paragraphs
    .map((para) => {
      const lines = para
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br />");
      return `<p>${lines}</p>`;
    })
    .join("");
}

function sanitizeImportedHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}

function extractLeadingMarkdownTitle(
  markdown: string,
  fallbackTitle: string
): { title: string; body: string } {
  const match = markdown.match(/^\s*#\s+(.+?)(?:\r?\n|$)/);
  if (!match) {
    return { title: fallbackTitle, body: markdown };
  }
  const extracted = match[1].trim();
  const remaining = markdown.slice(match[0].length).trimStart();
  return {
    title: extracted.slice(0, 180) || fallbackTitle,
    body: remaining || markdown,
  };
}

export function parseImportedFileContent(
  fileName: string,
  fileSize: number,
  rawContent: string
): ParsedImportedDocument {
  const validation = validateImportFile(fileName, fileSize);
  if (!validation.valid) {
    throw new ValidationError(validation.error);
  }

  const ext = getFileExtension(fileName);
  const fallbackTitle = deriveTitleFromFileName(fileName);

  if (ext === ".txt") {
    return {
      title: fallbackTitle,
      contentHtml: plainTextToHtml(rawContent),
    };
  }

  const { title, body } = extractLeadingMarkdownTitle(rawContent, fallbackTitle);
  const rendered = marked.parse(body, { async: false, gfm: true, breaks: false });
  const cleanedHtml = sanitizeImportedHtml(rendered).trim();

  return {
    title,
    contentHtml: cleanedHtml || "<p></p>",
  };
}

