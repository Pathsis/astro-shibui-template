import { getCollection, type CollectionEntry } from "astro:content";
import { countWords } from "./word-count";

export type SiteLang = "zh-cn" | "en";
export type BlogEntry = CollectionEntry<"blog-zh"> | CollectionEntry<"blog-en">;
export interface PostStats {
  posts: BlogEntry[];
  postCount: number;
  totalWords: number;
  firstYear: number;
}

const publishedPostsCache = new Map<SiteLang, Promise<BlogEntry[]>>();
const postStatsCache = new Map<SiteLang, Promise<PostStats>>();

export function getBlogCollectionName(lang: SiteLang): "blog-zh" | "blog-en" {
  return lang === "en" ? "blog-en" : "blog-zh";
}

export async function getPublishedPosts(lang: SiteLang): Promise<BlogEntry[]> {
  const cached = publishedPostsCache.get(lang);
  if (cached) return cached;

  const promise = loadPublishedPosts(lang);
  publishedPostsCache.set(lang, promise);
  return promise;
}

async function loadPublishedPosts(lang: SiteLang): Promise<BlogEntry[]> {
  const collectionName = getBlogCollectionName(lang);
  const posts = await getCollection(collectionName, ({ data }) => !data.draft);
  return posts.filter((post) => post.id && !post.id.startsWith("_")) as BlogEntry[];
}

export async function getPostStats(lang: SiteLang): Promise<PostStats> {
  const cached = postStatsCache.get(lang);
  if (cached) return cached;

  const promise = loadPostStats(lang);
  postStatsCache.set(lang, promise);
  return promise;
}

async function loadPostStats(lang: SiteLang): Promise<PostStats> {
  const posts = await getPublishedPosts(lang);
  const totalWords = posts.reduce((sum, post) => sum + countWords(post.body ?? "", lang), 0);
  const firstYear = posts.reduce((min, post) => {
    const year = new Date(post.data.date).getFullYear();
    return Number.isFinite(year) ? Math.min(min, year) : min;
  }, new Date().getFullYear());

  return {
    posts,
    postCount: posts.length,
    totalWords,
    firstYear,
  };
}
