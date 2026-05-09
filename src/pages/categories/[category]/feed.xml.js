import { getCollection } from 'astro:content';
import { siteConfig } from '@site-config';
import { buildSiteRss } from '../../../lib/rss-feed';

export async function getStaticPaths() {
  const zhPosts = await getCollection('blog-zh', ({ data }) => !data.draft);
  const categories = new Set();
  zhPosts.forEach((post) => {
    post.data.categories?.forEach((cat) => categories.add(cat));
  });
  return Array.from(categories).map((category) => ({ params: { category } }));
}

export async function GET(context) {
  const { category } = context.params;
  const posts = await getCollection('blog-zh', ({ data }) => !data.draft);
  const categoryPosts = posts
    .filter((post) => post.data.categories?.includes(category))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, 10);

  return buildSiteRss({
    posts: categoryPosts,
    lang: 'zh-cn',
    title: `${siteConfig.title} - ${category}`,
    description: `分类 ${category} 的文章订阅`,
    context,
  });
}
