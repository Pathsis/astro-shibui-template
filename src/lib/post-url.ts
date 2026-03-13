export type SupportedLang = "zh-cn" | "en";

export function toPublicPostSlug(id: string, lang: SupportedLang): string {
  void lang;
  return id;
}

export function getLocalizedBlogPathById(id: string, lang: SupportedLang): string {
  return `/blog/${toPublicPostSlug(id, lang)}/`;
}

/**
 * Infer the paired translation id by naming convention:
 * zh-cn/blog-zh and en/blog-en use the same file id.
 * For example: how-to-write-blog.md in both directories are paired.
 */
export function getPairedTranslationIdByConvention(id: string, targetLang: SupportedLang): string | undefined {
  if (!id) return undefined;
  
  // Same id is used for both languages
  // Just return the id, the page will look up in the correct collection based on targetLang
  return id;
}
