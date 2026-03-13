const SKIP_PARAGRAPH_RE = /^(#{1,6}\s|>\s|[-*+]\s|\d+\.\s|!\[)/;

export function toPlainText(markdown: string): string {
  return markdown
    .replace(/---[\s\S]*?---/g, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_>\-\[\](){}|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFirstParagraph(markdown: string): string {
  const blocks = markdown
    .replace(/\r\n/g, "\n")
    .replace(/```[\s\S]*?```/g, "\n")
    .split(/\n\s*\n/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (SKIP_PARAGRAPH_RE.test(trimmed)) continue;
    const plain = toPlainText(trimmed);
    if (plain.length > 0) return plain;
  }

  return toPlainText(markdown);
}

export function truncateChars(text: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  const chars = Array.from(text.trim());
  if (chars.length <= maxChars) return chars.join("");
  return `${chars.slice(0, maxChars).join("")}[…]`;
}
