import { getCollection } from "astro:content";
import { getRelativeLocaleUrl } from "astro:i18n";
import { getLocalizedBlogPathById } from "./post-url";
import { extractFirstImageFromMarkdown, normalizeImagePath } from "./image-path";
import { resolveCoverImageUrl } from "./image-cdn";
import { getExplicitRelatedPosts } from "./related-posts";
import type { CollectionEntry } from "astro:content";
import type { SocialImageSource } from "./social-image";
import { siteConfig } from "@site-config";
export { formatDate, formatDateTimeMinute } from "./date";

type BlogEntry = CollectionEntry<"blog-zh"> | CollectionEntry<"blog-en">;

export function getRecommendedLabelPrefix(currentLang: "zh-cn" | "en"): string {
  return currentLang === "en" ? "Read more " : "阅读更多 ";
}

export function getRelatedAriaLabel(
  primaryTag: string | undefined,
  moreFromText: string,
  nextReadText: string,
  currentLang: "zh-cn" | "en"
): string {
  if (!primaryTag) return nextReadText;
  const separator = currentLang === "zh-cn" ? "" : " ";
  return `${moreFromText}${separator}${primaryTag}`;
}

export async function buildRelatedPosts(
  post: BlogEntry,
  currentLang: "zh-cn" | "en",
  relatedCount: number = 6,
  recommendedCount: number = 5
): Promise<{
  relatedPosts: BlogEntry[];
  recommendedPosts: BlogEntry[];
  recommendedItems: Array<{
    href: string;
    title: string;
    date: Date;
    podcast: boolean | undefined;
  }>;
}> {
  const currentPostId = post.id;
  const collectionName = currentLang === "en" ? "blog-en" : "blog-zh";
  const allPosts = await getCollection(collectionName, ({ data }) => !data.draft);
  const compareByDateDesc = (a: BlogEntry, b: BlogEntry) =>
    new Date(b.data.date).getTime() - new Date(a.data.date).getTime();

  const pushUniquePost = (list: BlogEntry[], entry?: BlogEntry) => {
    if (!entry || entry.id === currentPostId) return;
    if (list.some((item) => item.id === entry.id)) return;
    list.push(entry);
  };

  const relatedFromFrontmatter = getExplicitRelatedPosts(
    allPosts,
    currentPostId,
    post.data.related
  ).sort(compareByDateDesc);

  const relatedPosts: BlogEntry[] = [];
  for (const entry of relatedFromFrontmatter) {
    pushUniquePost(relatedPosts, entry);
  }

  if (post.data.tags?.length) {
    const [primaryTag, ...otherTags] = post.data.tags;
    const otherTagSet = new Set(otherTags);

    const primaryTagPosts = allPosts
      .filter(
        (entry) =>
          entry.id !== currentPostId &&
          !!primaryTag &&
          entry.data.tags?.includes(primaryTag)
      )
      .sort(compareByDateDesc);

    for (const entry of primaryTagPosts) {
      pushUniquePost(relatedPosts, entry);
      if (relatedPosts.length >= relatedCount) break;
    }

    if (relatedPosts.length < relatedCount && otherTagSet.size > 0) {
      const otherTagPosts = allPosts
        .filter(
          (entry) =>
            entry.id !== currentPostId &&
            entry.data.tags?.some((tag) => otherTagSet.has(tag))
        )
        .sort(compareByDateDesc);

      for (const entry of otherTagPosts) {
        pushUniquePost(relatedPosts, entry);
        if (relatedPosts.length >= relatedCount) break;
      }
    }
  }

  const featuredPosts = allPosts
    .filter(
      (entry) =>
        entry.id !== currentPostId &&
        entry.data.feature &&
        !relatedPosts.some((item) => item.id === entry.id)
    )
    .sort(compareByDateDesc)
    .slice(0, recommendedCount);

  const recommendedPosts =
    featuredPosts.length > 0
      ? featuredPosts
      : allPosts
          .filter(
            (entry) =>
              entry.id !== currentPostId &&
              !relatedPosts.some((item) => item.id === entry.id)
          )
          .sort(compareByDateDesc)
          .slice(0, recommendedCount);

  const recommendedItems = recommendedPosts.map((entry) => ({
    href: getRelativeLocaleUrl(currentLang, getLocalizedBlogPathById(entry.id, currentLang)),
    title: entry.data.title,
    date: entry.data.date,
    podcast: entry.data.podcast,
  }));

  return { relatedPosts, recommendedPosts, recommendedItems };
}

export function getPostCover(entry: BlogEntry): string {
  const rawCover = entry.data.images?.length
    ? normalizeImagePath(entry.data.images[0])
    : extractFirstImageFromMarkdown(entry.body ?? "");
  const fallbackCover = resolveCoverImageUrl(siteConfig.images.defaultOg) || siteConfig.images.defaultOg;
  return resolveCoverImageUrl(rawCover) || rawCover || fallbackCover;
}

export function resolveSocialImage(
  post: BlogEntry
): { socialImage: string | undefined; socialImageSource: SocialImageSource } {
  const socialImage = post.data.images?.length
    ? normalizeImagePath(post.data.images[0])
    : extractFirstImageFromMarkdown(post.body ?? "") || undefined;
  return { socialImage, socialImageSource: socialImage ? "images" : "other" };
}
