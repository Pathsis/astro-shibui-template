import { getCollection } from "astro:content";
import { getRelativeLocaleUrl } from "astro:i18n";
import { getLocalizedBlogPathById } from "./post-url";
import { normalizeImagePath } from "./image-path";
import {
  resolvePodcastArtwork,
  resolveSocialImage,
  type PodcastArtworkSet,
} from "./social-image";
import { siteConfig } from "@site-config";

export interface PodcastEpisode {
  slug: string;
  title: string;
  url: string;
  articleUrl: string;
  date: Date;
  lang: "zh-cn" | "en";
  description?: string;
  coverImage?: string;
  mediaArtwork?: PodcastArtworkSet;
}

const PODCAST_IMAGE_CANONICAL = new URL(siteConfig.siteUrl);

/**
 * 播放器内部唯一键（不影响公开文章 URL）。
 * 去掉英文文件名 -en 后，中英文文章 id 相同，需要通过语言区分播放器状态键。
 */
export function getPodcastEpisodeSlug(
  slug: string,
  lang: "zh-cn" | "en" = "zh-cn"
): string {
  return lang === "en" ? `${slug}__en` : slug;
}

function resolvePodcastCoverImage(rawImage: string | undefined, pageUrl: URL): string | undefined {
  const normalized = normalizeImagePath(rawImage);
  if (!normalized) return undefined;

  const resolved = resolveSocialImage(normalized, {
    pageUrl,
    source: "images",
  });

  // Keep local generated paths origin-agnostic so player works on any host/env.
  const parsed = new URL(resolved);
  if (parsed.origin === PODCAST_IMAGE_CANONICAL.origin) {
    return `${parsed.pathname}${parsed.search}`;
  }
  return resolved;
}

function toPortableImageUrl(src: string): string {
  const parsed = new URL(src);
  if (parsed.origin === PODCAST_IMAGE_CANONICAL.origin) {
    return `${parsed.pathname}${parsed.search}`;
  }
  return src;
}

function resolvePodcastMediaArtwork(rawImage: string | undefined, pageUrl: URL): PodcastArtworkSet | undefined {
  const normalized = normalizeImagePath(rawImage);
  if (!normalized) return undefined;

  const artwork = resolvePodcastArtwork(normalized, { pageUrl });
  if (!artwork) return undefined;

  return {
    ...(artwork.square ? { square: toPortableImageUrl(artwork.square) } : {}),
    ...(artwork.banner ? { banner: toPortableImageUrl(artwork.banner) } : {}),
  };
}

function getPodcastAudioKey(slug: string, lang: "zh-cn" | "en"): string {
  if (lang === "en") return `${slug}.en`;
  return slug;
}

/**
 * 获取所有带有播客的文章列表
 */
export async function getAllPodcastEpisodes(): Promise<PodcastEpisode[]> {
  const [zhPosts, enPosts] = await Promise.all([
    getCollection("blog-zh", ({ data }) => !data.draft),
    getCollection("blog-en", ({ data }) => !data.draft),
  ]);

  const episodes: PodcastEpisode[] = [];

  // 处理中文文章
  for (const post of zhPosts) {
    if (post.data.podcast) {
      // 获取封面图片
      const articleUrl = getRelativeLocaleUrl("zh-cn", getLocalizedBlogPathById(post.id, "zh-cn"));
      const pageUrl = new URL(articleUrl, PODCAST_IMAGE_CANONICAL);
      let coverImage: string | undefined;
      let mediaArtwork: PodcastArtworkSet | undefined;
      if (post.data.images && post.data.images.length > 0) {
        coverImage = resolvePodcastCoverImage(post.data.images[0], pageUrl);
        mediaArtwork = resolvePodcastMediaArtwork(post.data.images[0], pageUrl);
      }

      episodes.push({
        slug: getPodcastEpisodeSlug(post.id, "zh-cn"),
        title: post.data.title,
        url: getPodcastUrl(post.id, "zh-cn"),
        articleUrl,
        date: post.data.date,
        lang: "zh-cn",
        description: post.data.description,
        coverImage,
        mediaArtwork,
      });
    }
  }

  // 处理英文文章
  for (const post of enPosts) {
    if (post.data.podcast) {
      // 获取封面图片
      const articleUrl = getRelativeLocaleUrl("en", getLocalizedBlogPathById(post.id, "en"));
      const pageUrl = new URL(articleUrl, PODCAST_IMAGE_CANONICAL);
      let coverImage: string | undefined;
      let mediaArtwork: PodcastArtworkSet | undefined;
      if (post.data.images && post.data.images.length > 0) {
        coverImage = resolvePodcastCoverImage(post.data.images[0], pageUrl);
        mediaArtwork = resolvePodcastMediaArtwork(post.data.images[0], pageUrl);
      }

      episodes.push({
        slug: getPodcastEpisodeSlug(post.id, "en"),
        title: post.data.title,
        url: getPodcastUrl(post.id, "en"),
        articleUrl,
        date: post.data.date,
        lang: "en",
        description: post.data.description,
        coverImage,
        mediaArtwork,
      });
    }
  }

  // 按日期降序排列
  episodes.sort((a, b) => b.date.getTime() - a.date.getTime());

  return episodes;
}

/**
 * 获取播客音频 URL
 */
export function getPodcastUrl(slug: string, lang: "zh-cn" | "en" = "zh-cn"): string {
  const audioKey = getPodcastAudioKey(slug, lang);
  return `${siteConfig.podcast.audioBaseUrl}/${audioKey}.m4a`;
}
