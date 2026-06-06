import rss from '@astrojs/rss';
import { getRelativeLocaleUrl } from 'astro:i18n';
import { getLocalizedBlogPathById } from './post-url';
import { extractFirstImageFromMarkdown, normalizeImagePath } from './image-path';
import { escapeXmlAttribute, renderRssMarkdown } from './rss-content';
import {
  createSocialImageVersionToken,
  getDefaultSocialImageVersionSeed,
  resolveSocialImage,
} from './social-image';
import { formatRssDate } from './date';

const socialImageVersionToken = createSocialImageVersionToken(getDefaultSocialImageVersionSeed());

/**
 * 构造单个 RSS item(含封面图、脚注、enclosure)。
 */
function buildRssItem({ post, lang, context }) {
  const link = getRelativeLocaleUrl(lang, getLocalizedBlogPathById(post.id, lang));
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
    notesTitle: lang === 'en' ? 'Notes' : '注释',
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
}

/**
 * 为双语全站或分类生成 RSS。
 *
 * @param options.posts         已按日期排好序且切片完的文章(全站 10 篇 / 分类 10 篇)
 * @param options.lang          'zh-cn' | 'en'
 * @param options.title         feed <title>
 * @param options.description   feed <description>
 * @param options.context       Astro 路由的 context(提供 site)
 * @param options.feedPath      self <atom:link> 相对路径,仅全站 feed 需要(如 '/feed.xml' / '/en/feed.xml')
 * @param options.branding      siteConfig(含 rss.managingEditor / rss.webMaster / title)——
 *                              传入则在 customData 追加 managingEditor/webMaster/ttl/generator/copyright
 */
export function buildSiteRss({ posts, lang, title, description, context, feedPath, branding }) {
  const lastBuildDate = posts[0]?.data.date ?? new Date();
  const langCode = lang === 'en' ? 'en' : 'zh-CN';

  const customDataPieces = [`<language>${langCode}</language>`];
  if (feedPath) {
    customDataPieces.push(
      `<atom:link href="${new URL(feedPath, context.site)}" rel="self" type="application/rss+xml" />`
    );
  }
  customDataPieces.push(`<lastBuildDate>${formatRssDate(lastBuildDate)}</lastBuildDate>`);
  if (branding) {
    customDataPieces.push(
      `<managingEditor>${branding.rss.managingEditor}</managingEditor>`,
      `<webMaster>${branding.rss.webMaster}</webMaster>`,
      `<ttl>60</ttl>`,
      `<generator>Astro</generator>`,
      `<copyright>Copyright ${new Date().getFullYear()} ${title}</copyright>`,
    );
  }

  return rss({
    title,
    description,
    site: context.site,
    xmlns: feedPath ? { atom: 'http://www.w3.org/2005/Atom' } : undefined,
    items: posts.map((post) => buildRssItem({ post, lang, context })),
    customData: customDataPieces.join('\n'),
  });
}
