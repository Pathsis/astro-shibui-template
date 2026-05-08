import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getRelativeLocaleUrl } from 'astro:i18n';
import { getLocalizedBlogPathById } from '../../lib/post-url';
import { extractFirstImageFromMarkdown, normalizeImagePath } from '../../lib/image-path';
import { escapeXmlAttribute, renderRssMarkdown } from '../../lib/rss-content';
import {
  createSocialImageVersionToken,
  getDefaultSocialImageVersionSeed,
  resolveSocialImage,
} from '../../lib/social-image';
import { formatRssDate } from '../../lib/date';
import { siteConfig } from '@site-config';

const socialImageVersionToken = createSocialImageVersionToken(getDefaultSocialImageVersionSeed());

export async function GET(context) {
  const currentLang = 'en';
  const posts = await getCollection('blog-en', ({ data }) => !data.draft);
  
  // 按日期排序，最新的在前
  const sortedPosts = posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  
  // 限制为 10 篇
  const recentPosts = sortedPosts.slice(0, 10);
  const lastBuildDate = recentPosts[0]?.data.date ?? new Date();

  return rss({
    title: siteConfig.title,
    description: siteConfig.descriptions.en,
    site: context.site,
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
    },
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

      const sanitizedContent = renderRssMarkdown(post.body || '', {
        notesTitle: 'Notes',
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
    customData: `<language>en</language>
<atom:link href="${new URL('/en/feed.xml', context.site)}" rel="self" type="application/rss+xml" />
<lastBuildDate>${formatRssDate(lastBuildDate)}</lastBuildDate>
<managingEditor>${siteConfig.rss.managingEditor}</managingEditor>
<webMaster>${siteConfig.rss.webMaster}</webMaster>
<ttl>60</ttl>
<generator>Astro</generator>
<copyright>Copyright ${new Date().getFullYear()} ${siteConfig.title}</copyright>`,
  });
}
