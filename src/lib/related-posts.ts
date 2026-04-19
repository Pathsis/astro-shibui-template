import type { CollectionEntry } from "astro:content";

export type RelatedBlogEntry = CollectionEntry<"blog-zh"> | CollectionEntry<"blog-en">;
export type RelatedValue = string | string[] | undefined;

export const normalizeRelatedTarget = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const noQuery = trimmed.split("?")[0].split("#")[0] || "";
  const noExt = noQuery.replace(/\.mdx?$/i, "");
  const noSlashes = noExt.replace(/^\/+|\/+$/g, "");
  if (!noSlashes) return "";
  if (noSlashes.startsWith("blog/")) return noSlashes.slice(5);
  if (noSlashes.startsWith("en/blog/")) return noSlashes.slice(8);
  return noSlashes;
};

export const normalizeRelatedTargets = (value?: RelatedValue) => {
  if (!value) return [];
  const rawValues = Array.isArray(value) ? value : value.split(",");
  return rawValues
    .map(normalizeRelatedTarget)
    .filter(Boolean);
};

const byDateDesc = (a: RelatedBlogEntry, b: RelatedBlogEntry) =>
  new Date(b.data.date).getTime() - new Date(a.data.date).getTime();

export const getExplicitRelatedPosts = <Entry extends RelatedBlogEntry>(
  allPosts: Entry[],
  currentPostId: string,
  currentRelated?: RelatedValue
) => {
  const outgoingTargets = new Set(normalizeRelatedTargets(currentRelated));

  return allPosts
    .filter((entry) => {
      if (entry.id === currentPostId) return false;
      const incomingTargets = normalizeRelatedTargets(entry.data.related);
      return outgoingTargets.has(entry.id) || incomingTargets.includes(currentPostId);
    })
    .sort(byDateDesc) as Entry[];
};
