function decodeBasicEntities(text: string): string {
  return text
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function stripInlineTags(html: string): string {
  return decodeBasicEntities(
    html
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
      .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
      .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
      .replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, "__$1__")
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  ).trim();
}

export function htmlToMarkdown(title: string, contentHtml: string): string {
  let body = contentHtml
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, inner: string) => `# ${stripInlineTags(inner)}\n\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, inner: string) => `## ${stripInlineTags(inner)}\n\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, inner: string) => `### ${stripInlineTags(inner)}\n\n`)
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner: string) => `> ${stripInlineTags(inner)}\n\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner: string) => `- ${stripInlineTags(inner)}\n`)
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner: string) => {
      const text = stripInlineTags(inner);
      return text ? `${text}\n\n` : "";
    })
    .replace(/<hr\s*\/?>/gi, "---\n\n");

  body = stripInlineTags(body)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return `# ${title}\n\n${body}\n`;
}

export function htmlToPlainText(contentHtml: string): string {
  const spaced = contentHtml
    .replace(/<\/(p|h1|h2|h3|li|blockquote|div)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeBasicEntities(spaced)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

