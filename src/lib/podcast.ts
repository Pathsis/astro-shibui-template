import { getCollection } from "astro:content";
import { getRelativeLocaleUrl } from "astro:i18n";
import { getLocalizedBlogPathById } from "./post-url";
import { normalizeImagePath } from "./image-path";
import { resolveSocialImage } from "./social-image";
import { siteConfig } from "./config";

export interface PodcastEpisode {
  slug: string;
  title: string;
  url: string;
  articleUrl: string;
  date: Date;
  lang: "zh-cn" | "en";
  description?: string;
  coverImage?: string;
}

const PODCAST_IMAGE_CANONICAL = new URL(import.meta.env.PUBLIC_SITE_URL || "https://yourdomain.com");

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

function resolvePodcastCoverImage(rawImage?: string): string | undefined {
  const normalized = normalizeImagePath(rawImage);
  if (!normalized) return undefined;

  const resolved = resolveSocialImage(normalized, {
    pageUrl: PODCAST_IMAGE_CANONICAL,
    source: "images",
  });

  // Keep local generated paths origin-agnostic so player works on any host/env.
  const parsed = new URL(resolved);
  if (parsed.origin === PODCAST_IMAGE_CANONICAL.origin) {
    return `${parsed.pathname}${parsed.search}`;
  }
  return resolved;
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
    getCollection("blog-zh"),
    getCollection("blog-en"),
  ]);

  const episodes: PodcastEpisode[] = [];

  // 处理中文文章
  for (const post of zhPosts) {
    if (post.data.podcast) {
      // 获取封面图片
      let coverImage: string | undefined;
      if (post.data.images && post.data.images.length > 0) {
        coverImage = resolvePodcastCoverImage(post.data.images[0]);
      }

      episodes.push({
        slug: getPodcastEpisodeSlug(post.id, "zh-cn"),
        title: post.data.title,
        url: getPodcastUrl(post.id, "zh-cn"),
        articleUrl: getRelativeLocaleUrl("zh-cn", getLocalizedBlogPathById(post.id, "zh-cn")),
        date: post.data.date,
        lang: "zh-cn",
        description: post.data.description,
        coverImage,
      });
    }
  }

  // 处理英文文章
  for (const post of enPosts) {
    if (post.data.podcast) {
      // 获取封面图片
      let coverImage: string | undefined;
      if (post.data.images && post.data.images.length > 0) {
        coverImage = resolvePodcastCoverImage(post.data.images[0]);
      }

      episodes.push({
        slug: getPodcastEpisodeSlug(post.id, "en"),
        title: post.data.title,
        url: getPodcastUrl(post.id, "en"),
        articleUrl: getRelativeLocaleUrl("en", getLocalizedBlogPathById(post.id, "en")),
        date: post.data.date,
        lang: "en",
        description: post.data.description,
        coverImage,
      });
    }
  }

  // 按日期降序排列
  episodes.sort((a, b) => b.date.getTime() - a.date.getTime());

  return episodes;
}

/**
 * 检查指定文章是否有播客
 */
export async function hasPodcast(
  id: string,
  collection: "blog-zh" | "blog-en"
): Promise<boolean> {
  const posts = await getCollection(collection);
  const post = posts.find((p) => p.id === id);
  return post?.data.podcast ?? false;
}

/**
 * 获取播客音频 URL
 * 音频 URL 格式：https://r2.yourdomain.com/slug.m4a
 * 中文文章：slug.m4a
 * 英文文章：slug.en.m4a
 */
export function getPodcastUrl(slug: string, lang: "zh-cn" | "en" = "zh-cn"): string {
  const audioKey = getPodcastAudioKey(slug, lang);
  // 优先使用环境变量，允许用户通过环境变量配置
  const baseUrl = import.meta.env.PUBLIC_PODCAST_AUDIO_BASE_URL || siteConfig.features.podcast.audioBaseUrl;
  if (!baseUrl) {
    throw new Error("播客功能未配置：请设置 PUBLIC_PODCAST_AUDIO_BASE_URL 环境变量");
  }
  // 确保 baseUrl 以 / 结尾
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  return `${normalizedBaseUrl}${audioKey}.m4a`;
}
