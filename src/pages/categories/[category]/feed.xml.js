import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getRelativeLocaleUrl } from 'astro:i18n';
import { getLocalizedBlogPathById } from '../../../lib/post-url';
import { extractFirstImageFromMarkdown, normalizeImagePath } from '../../../lib/image-path';
import { escapeXmlAttribute, renderRssMarkdown } from '../../../lib/rss-content';
import {
  createSocialImageVersionToken,
  getDefaultSocialImageVersionSeed,
  resolveSocialImage,
} from '../../../lib/social-image';
import { formatRssDate } from '../../../lib/date';
import { siteConfig } from '@site-config';

const socialImageVersionToken = createSocialImageVersionToken(getDefaultSocialImageVersionSeed());

export async function getStaticPaths() {
  const zhPosts = await getCollection("blog-zh", ({ data }) => !data.draft);
  const enPosts = await getCollection("blog-en", ({ data }) => !data.draft);
  
  const categories = new Set();
  
  zhPosts.forEach((post) => {
    post.data.categories?.forEach((cat) => categories.add(cat));
  });
  
  enPosts.forEach((post) => {
    post.data.categories?.forEach((cat) => categories.add(cat));
  });
  
  return Array.from(categories).map((category) => ({
    params: { category },
  }));
}

export async function GET(context) {
  const { category } = context.params;
  const currentLang = 'zh-cn';
  
  const posts = await getCollection('blog-zh', ({ data }) => !data.draft);
  
  const categoryPosts = posts
    .filter((post) => post.data.categories?.includes(category))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, 10); // 限制 10 篇
  const lastBuildDate = categoryPosts[0]?.data.date ?? new Date();

  return rss({
    title: `${siteConfig.title} - ${category}`,
    description: `分类 ${category} 的文章订阅`,
    site: context.site,
    items: categoryPosts.map((post) => {
      const link = getRelativeLocaleUrl(currentLang, getLocalizedBlogPathById(post.id, currentLang));
      const pageUrl = new URL(link, context.site);

      let coverUrl = '';
      let coverSource = 'other';
      if (post.data.images && post.data.images.length > 0) {
        coverUrl = normalizeImagePath(post.data.images[0]) || '';
        coverSource = 'images';
      } else {
        coverUrl = extractFirstImageFromMarkdown(post.body) || '';
      }
      if (coverUrl) {
        coverUrl = resolveSocialImage(coverUrl, {
          pageUrl,
          versionToken: socialImageVersionToken,
          source: coverSource,
        });
      }

      const sanitizedContent = renderRssMarkdown(post.body || '', {
        notesTitle: '注释',
        footnoteIdPrefix: post.id,
      });
      const escapedCoverUrl = escapeXmlAttribute(coverUrl);
      const escapedTitle = escapeXmlAttribute(post.data.title);

      const finalContent = coverUrl 
        ? `<img src="${escapedCoverUrl}" alt="${escapedTitle}" /><br/>${sanitizedContent}`
        : sanitizedContent;
      const itemCustomData = [
        `<pubDate>${formatRssDate(post.data.date)}</pubDate>`,
        coverUrl ? `<enclosure url="${escapedCoverUrl}" type="image/jpeg" length="0" />` : '',
      ].join('');

      return {
        title: post.data.title,
        description: post.data.description,
        link,
        content: finalContent,
        customData: itemCustomData,
      };
    }),
    customData: `<language>zh-CN</language>
<lastBuildDate>${formatRssDate(lastBuildDate)}</lastBuildDate>`,
  });
}
