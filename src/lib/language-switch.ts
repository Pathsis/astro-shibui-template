import { getRelativeLocaleUrl } from "astro:i18n";

export type SwitchablePageKind = "home" | "section" | "taxonomy" | "term" | "article" | "page";
export type SwitchableLang = "zh-cn" | "en";

interface LanguageSwitchOptions {
  pageKind: SwitchablePageKind;
  lang: SwitchableLang;
  pathname: string;
  hasTranslation?: boolean;
  targetSlug?: string;
}

export const getTargetLang = (lang: SwitchableLang): SwitchableLang =>
  lang === "zh-cn" ? "en" : "zh-cn";

export function getLanguageSwitchHref({
  pageKind,
  lang,
  pathname,
  hasTranslation = false,
  targetSlug,
}: LanguageSwitchOptions) {
  const targetLang = getTargetLang(lang);

  if (pageKind === "home") {
    return getRelativeLocaleUrl(targetLang, "/");
  }

  if (pageKind === "article") {
    if (!hasTranslation || !targetSlug) return undefined;
    return getRelativeLocaleUrl(targetLang, `/blog/${targetSlug}/`);
  }

  if (pageKind === "section") {
    const pathWithoutLang = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
    return getRelativeLocaleUrl(targetLang, pathWithoutLang);
  }

  if (pageKind === "taxonomy") {
    const pathWithoutLang = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
    return getRelativeLocaleUrl(targetLang, pathWithoutLang);
  }

  if (pageKind === "term") {
    if (!hasTranslation) return undefined;
    const pathWithoutLang = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
    return getRelativeLocaleUrl(targetLang, pathWithoutLang);
  }

  return undefined;
}
