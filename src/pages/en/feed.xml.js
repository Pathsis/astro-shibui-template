import { getCollection } from 'astro:content';
import { siteConfig } from '@site-config';
import { buildSiteRss } from '../../lib/rss-feed';

export async function GET(context) {
  const posts = await getCollection('blog-en', ({ data }) => !data.draft);
  const recentPosts = posts
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, 10);

  return buildSiteRss({
    posts: recentPosts,
    lang: 'en',
    title: siteConfig.titleEn,
    description: siteConfig.descriptions.en,
    context,
    feedPath: '/en/feed.xml',
    branding: siteConfig,
  });
}
