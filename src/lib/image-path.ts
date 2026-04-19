export function normalizeImagePath(image?: string): string | undefined {
  if (!image) return image;

  const normalized = image.trim();
  if (!normalized) return undefined;

  // Keep absolute/protocol-relative/data/blob URLs unchanged.
  if (
    /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(normalized) ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function extractFirstImageFromMarkdown(markdown?: string): string | undefined {
  if (!markdown) return undefined;

  const markdownImageMatch = markdown.match(/!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/i);
  if (markdownImageMatch?.[1]) {
    return normalizeImagePath(markdownImageMatch[1]);
  }

  const htmlImageMatch = markdown.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlImageMatch?.[1]) {
    return normalizeImagePath(htmlImageMatch[1]);
  }

  return undefined;
}
