import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getRelativeLocaleUrl } from 'astro:i18n';
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';
import { getLocalizedBlogPathById } from '../../lib/post-url';
import { extractFirstImageFromMarkdown, normalizeImagePath } from '../../lib/image-path';
import {
  createSocialImageVersionToken,
  getDefaultSocialImageVersionSeed,
  resolveSocialImage,
} from '../../lib/social-image';
import { siteConfig } from '../../lib/config';

const parser = new MarkdownIt();
const socialImageVersionToken = createSocialImageVersionToken(getDefaultSocialImageVersionSeed());

export async function GET(context) {
  const currentLang = 'en';
  const posts = await getCollection('blog-en');
  
  // 按日期排序，最新的在前
  const sortedPosts = posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  
  // 限制为 10 篇
  const recentPosts = sortedPosts.slice(0, 10);

  return rss({
    title: siteConfig.name,
    description: siteConfig.description,
    site: context.site,
    items: recentPosts.map((post) => {
      const link = getRelativeLocaleUrl(currentLang, getLocalizedBlogPathById(post.id, "en"));
      const pageUrl = new URL(link, context.site);

      // 获取封面图片 URL（与页面 OG/Twitter 使用同一套裁切逻辑）
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
    customData: `<language>en</language>`,
  });
}
