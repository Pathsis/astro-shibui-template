export function hasFootnotesInMarkdown(body: string): boolean {
  return /\[\^[^\]]+\]:/m.test(body);
}

export function hasHangingFiguresInMarkdown(body: string): boolean {
  return /class=["'][^"']*\balign-(left|right)\b[^"']*["']|!\[[^\]]*]\([^)]+["'][^"']*\balign-(left|right)\b[^"']*["']\)/im.test(body);
}

export function hasMermaidInMarkdown(body: string): boolean {
  return /```mermaid\b|<div[^>]+class=["'][^"']*\bmermaid\b[^"']*["']/im.test(body);
}
