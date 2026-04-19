import { getCollection } from "astro:content";
import { getRelativeLocaleUrl } from "astro:i18n";
import { getLocalizedBlogPathById } from "./post-url";
import { extractFirstImageFromMarkdown, normalizeImagePath } from "./image-path";
import { getExplicitRelatedPosts } from "./related-posts";
import type { CollectionEntry } from "astro:content";
import type { SocialImageSource } from "./social-image";
import { siteConfig } from "@site-config";

type BlogEntry = CollectionEntry<"blog-zh"> | CollectionEntry<"blog-en">;

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

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
  const allPosts = await getCollection(collectionName);

  const pushUniquePost = (list: BlogEntry[], entry?: BlogEntry) => {
    if (!entry || entry.id === currentPostId) return;
    if (list.some((item) => item.id === entry.id)) return;
    list.push(entry);
  };

  const relatedFromFrontmatter = getExplicitRelatedPosts(allPosts, currentPostId, post.data.related);

  const relatedPosts: BlogEntry[] = [];
  for (const entry of relatedFromFrontmatter) {
    pushUniquePost(relatedPosts, entry);
  }

  if (post.data.tags?.length) {
    const tagMatchedPosts = allPosts
      .filter((entry) =>
        entry.id !== currentPostId &&
        entry.data.tags?.some((tag) => post.data.tags?.includes(tag))
      )
      .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

    for (const entry of tagMatchedPosts) {
      pushUniquePost(relatedPosts, entry);
      if (relatedPosts.length >= relatedCount) break;
    }
  }

  const featuredPosts = allPosts
    .filter(
      (entry) =>
        entry.id !== currentPostId &&
        entry.data.feature &&
        !relatedPosts.some((item) => item.id === entry.id)
    )
    .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())
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
          .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())
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
  if (entry.data.images?.length) {
    return normalizeImagePath(entry.data.images[0]) || siteConfig.images.defaultOg;
  }
  return extractFirstImageFromMarkdown(entry.body ?? "") || siteConfig.images.defaultOg;
}

export function resolveSocialImage(
  post: BlogEntry
): { socialImage: string | undefined; socialImageSource: SocialImageSource } {
  const socialImage = post.data.images?.length
    ? normalizeImagePath(post.data.images[0])
    : extractFirstImageFromMarkdown(post.body ?? "") || undefined;
  return { socialImage, socialImageSource: socialImage ? "images" : "other" };
}
