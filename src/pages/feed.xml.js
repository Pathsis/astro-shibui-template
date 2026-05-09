import { getCollection } from 'astro:content';
import { siteConfig } from '@site-config';
import { buildSiteRss } from '../lib/rss-feed';

export async function GET(context) {
  const posts = await getCollection('blog-zh', ({ data }) => !data.draft);
  const recentPosts = posts
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, 10);

  return buildSiteRss({
    posts: recentPosts,
    lang: 'zh-cn',
    title: siteConfig.title,
    description: siteConfig.descriptions.zh,
    context,
    feedPath: '/feed.xml',
    branding: siteConfig,
  });
}
