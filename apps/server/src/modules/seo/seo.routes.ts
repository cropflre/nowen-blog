import { Hono } from 'hono';
import { siteSettings } from '../../config/site';
import { env } from '../../config/env';
import {
  absoluteUrl,
  escapeXml,
  formatRssDate,
  formatSitemapDate,
  stripMarkdown,
  truncateText,
} from '../../lib/seo';
import { listPublishedForFeed, listPublishedForSitemap } from '../posts/posts.repository';
import { listCategories, listTags } from '../taxonomies/taxonomies.service';
import type { PostRow } from '../../lib/mapping';

const RSS_LIMIT = 50;
const STATIC_PAGES = ['/', '/posts', '/categories', '/tags', '/archive', '/search', '/about'];

export const rssRoutes = new Hono();

rssRoutes.get('/', async (c) => {
  const posts = await listPublishedForFeed(RSS_LIMIT);
  const items = posts
    .map((p: PostRow) => {
      const desc = p.summary ?? truncateText(stripMarkdown(p.contentMd), 200);
      const cats = (p.categoryLinks ?? [])
        .map((l) => l.category.name)
        .map(escapeXml)
        .join('</category><category>');
      const url = absoluteUrl(`/posts/${p.slug}`);
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid>${escapeXml(url)}</guid>
      <pubDate>${formatRssDate(p.publishedAt)}</pubDate>
      <description>${escapeXml(desc)}</description>
      ${cats ? `<category>${cats}</category>` : ''}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteSettings.siteTitle)}</title>
    <link>${escapeXml(env.baseUrl)}</link>
    <description>${escapeXml(siteSettings.siteDescription)}</description>
    <lastBuildDate>${formatRssDate(new Date().toISOString())}</lastBuildDate>
    <generator>NOWEN Blog</generator>
${items}
  </channel>
</rss>`;

  return c.body(xml, 200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
});

export const sitemapRoutes = new Hono();

function urlXml(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

sitemapRoutes.get('/', async (c) => {
  const [posts, categories, tags] = await Promise.all([
    listPublishedForSitemap(),
    listCategories(),
    listTags(),
  ]);
  const today = formatSitemapDate(new Date().toISOString());

  const urls: string[] = [];
  for (const path of STATIC_PAGES) {
    urls.push(urlXml(absoluteUrl(path), today, 'weekly', path === '/' ? '1.0' : '0.6'));
  }
  for (const p of posts) {
    urls.push(
      urlXml(
        absoluteUrl(`/posts/${p.slug}`),
        formatSitemapDate(p.publishedAt ?? p.updatedAt),
        'weekly',
        '0.8',
      ),
    );
  }
  for (const cat of categories) {
    urls.push(
      urlXml(absoluteUrl(`/categories/${encodeURIComponent(cat.slug)}`), today, 'monthly', '0.5'),
    );
  }
  for (const tag of tags) {
    urls.push(
      urlXml(absoluteUrl(`/tags/${encodeURIComponent(tag.slug)}`), today, 'monthly', '0.5'),
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});

export const robotsRoutes = new Hono();

robotsRoutes.get('/', (c) => {
  const txt = `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`;
  return c.body(txt, 200, { 'Content-Type': 'text/plain; charset=utf-8' });
});
