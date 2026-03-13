import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getRelativeLocaleUrl } from 'astro:i18n';
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';
import { getLocalizedBlogPathById } from '../../../lib/post-url';
import { extractFirstImageFromMarkdown, normalizeImagePath } from '../../../lib/image-path';
import {
  createSocialImageVersionToken,
  getDefaultSocialImageVersionSeed,
  resolveSocialImage,
} from '../../../lib/social-image';

const parser = new MarkdownIt();
const socialImageVersionToken = createSocialImageVersionToken(getDefaultSocialImageVersionSeed());

export async function getStaticPaths() {
  const zhPosts = await getCollection("blog-zh");
  const enPosts = await getCollection("blog-en");
  
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
  
  const posts = await getCollection('blog-zh');
  
  const categoryPosts = posts
    .filter((post) => post.data.categories?.includes(category))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, 10); // 限制 10 篇

  return rss({
    title: `2750 words - ${category}`,
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

      const htmlContent = parser.render(post.body || '');
      const sanitizedContent = sanitizeHtml(htmlContent, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          img: ['src', 'alt', 'title']
        }
      });

      const finalContent = coverUrl 
        ? `<img src="${coverUrl}" alt="${post.data.title}" /><br/>${sanitizedContent}`
        : sanitizedContent;

      return {
        title: post.data.title,
        pubDate: post.data.date,
        description: post.data.description,
        link,
        content: finalContent,
        customData: coverUrl ? `<enclosure url="${coverUrl}" type="image/jpeg" length="0" />` : '',
      };
    }),
    customData: `<language>zh-CN</language>`,
  });
}
