import { Hono } from 'hono';
import { env } from '../../config/env';
import { sqlite } from '../../db/client';
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
import { getSiteSettings } from '../settings/settings.service';
import type { PostRow } from '../../lib/mapping';

const RSS_LIMIT = 50;
const STATIC_PAGES = ['/', '/docs', '/posts', '/projects', '/categories', '/tags', '/archive', '/search', '/about'];

export const rssRoutes = new Hono();

rssRoutes.get('/', async (c) => {
  const settings = getSiteSettings();
  const posts = await listPublishedForFeed(RSS_LIMIT);
  const items = posts
    .map((post: PostRow) => {
      const description = post.summary ?? truncateText(stripMarkdown(post.contentMd), 200);
      const categories = (post.categoryLinks ?? [])
        .map((link) => link.category.name)
        .map(escapeXml)
        .join('</category><category>');
      const url = absoluteUrl(`/posts/${post.slug}`);
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid>${escapeXml(url)}</guid>
      <pubDate>${formatRssDate(post.publishedAt)}</pubDate>
      <description>${escapeXml(description)}</description>
      ${categories ? `<category>${categories}</category>` : ''}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(settings.siteTitle)}</title>
    <link>${escapeXml(env.baseUrl)}</link>
    <description>${escapeXml(settings.siteDescription)}</description>
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

function tableExists(name: string): boolean {
  return Boolean(
    sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type IN ('table', 'view') AND name = ? LIMIT 1").get(name),
  );
}

function encodeDocPath(path: string): string {
  return path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
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
    urls.push(urlXml(absoluteUrl(path), today, 'weekly', path === '/' ? '1.0' : path === '/docs' ? '0.9' : '0.6'));
  }
  for (const post of posts) {
    urls.push(
      urlXml(
        absoluteUrl(`/posts/${post.slug}`),
        formatSitemapDate(post.publishedAt ?? post.updatedAt),
        'weekly',
        '0.8',
      ),
    );
  }
  for (const category of categories) {
    urls.push(
      urlXml(absoluteUrl(`/categories/${encodeURIComponent(category.slug)}`), today, 'monthly', '0.5'),
    );
  }
  for (const tag of tags) {
    urls.push(
      urlXml(absoluteUrl(`/tags/${encodeURIComponent(tag.slug)}`), today, 'monthly', '0.5'),
    );
  }

  if (tableExists('documents')) {
    const documents = sqlite
      .prepare(
        `SELECT d.path, d.updated_at AS updatedAt,
                s.slug AS spaceSlug, v.version
           FROM documents d
           JOIN doc_spaces s ON s.id = d.space_id
           JOIN doc_versions v ON v.id = d.version_id
          WHERE d.status = 'published' AND d.visibility = 'public'
            AND s.is_published = 1 AND v.status = 'published'
          ORDER BY d.updated_at DESC`,
      )
      .all() as Array<{ path: string; updatedAt: string; spaceSlug: string; version: string }>;
    const roots = new Set<string>();
    for (const document of documents) {
      const root = `/docs/${encodeURIComponent(document.spaceSlug)}/${encodeURIComponent(document.version)}`;
      if (!roots.has(root)) {
        roots.add(root);
        urls.push(urlXml(absoluteUrl(root), formatSitemapDate(document.updatedAt), 'weekly', '0.8'));
      }
      urls.push(
        urlXml(
          absoluteUrl(`${root}/${encodeDocPath(document.path)}`),
          formatSitemapDate(document.updatedAt),
          'weekly',
          '0.85',
        ),
      );
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});

export const robotsRoutes = new Hono();

robotsRoutes.get('/', (c) => {
  const text = `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`;
  return c.body(text, 200, { 'Content-Type': 'text/plain; charset=utf-8' });
});
