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
 */
export function getPairedTranslationIdByConvention(id: string, lang: SupportedLang): string | undefined {
  void lang;
  if (!id) return undefined;
  return id;
}
