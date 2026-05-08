import type { APIRoute } from "astro";
import { getAllPodcastEpisodes } from "../lib/podcast";

export const GET: APIRoute = async () => {
  const episodes = await getAllPodcastEpisodes();

  const serialized = episodes.map((ep) => ({
    slug: ep.slug,
    title: ep.title,
    url: ep.url,
    articleUrl: ep.articleUrl,
    date: ep.date.toISOString(),
    lang: ep.lang,
    description: ep.description ?? null,
    coverImage: ep.coverImage ?? null,
    mediaArtwork: ep.mediaArtwork ?? null,
  }));

  return new Response(JSON.stringify(serialized), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
