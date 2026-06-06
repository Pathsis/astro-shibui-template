import { getCollection } from 'astro:content';
import { siteConfig } from '@site-config';
import { buildSiteRss } from '../../../../lib/rss-feed';
import { buildCategoryGroups } from '../../../../lib/taxonomy';

export async function getStaticPaths() {
  const enPosts = await getCollection('blog-en', ({ data }) => !data.draft);
  const groups = buildCategoryGroups(
    enPosts.map((post) => post.data.categories),
    'en',
  );
  return groups.map((group) => ({
    params: { category: group.canonicalLabel },
    props: {
      canonicalCategory: group.canonicalLabel,
      matchedCategories: group.matchValues,
    },
  }));
}

export async function GET(context) {
  const { category } = context.params;
  const { canonicalCategory = category, matchedCategories = [canonicalCategory] } = context.props ?? {};
  const posts = await getCollection('blog-en', ({ data }) => !data.draft);
  const categoryPosts = posts
    .filter((post) => post.data.categories?.some((value) => matchedCategories.includes(value)))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, 10);

  return buildSiteRss({
    posts: categoryPosts,
    lang: 'en',
    title: `${siteConfig.title} - ${canonicalCategory}`,
    description: `Category ${canonicalCategory} feed`,
    context,
  });
}
