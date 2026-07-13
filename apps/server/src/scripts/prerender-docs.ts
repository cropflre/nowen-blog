import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { defaultSchema, type Schema } from 'hast-util-sanitize';
import { sqlite } from '../db/client';
import { siteSettings } from '../config/site';
import { absoluteUrl } from '../lib/seo';

interface SpaceRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  updatedAt: string;
}

interface VersionRow {
  id: string;
  spaceId: string;
  version: string;
  label: string;
}

interface DocumentRow {
  id: string;
  spaceId: string;
  versionId: string;
  parentId: string | null;
  title: string;
  path: string;
  description: string | null;
  contentMd: string;
  editUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  depth: number;
  publishedAt: string | null;
  updatedAt: string;
}

const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className']],
    span: [...(defaultSchema.attributes?.span ?? []), ['className']],
    pre: [...(defaultSchema.attributes?.pre ?? []), ['className']],
  },
};

const mdProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeHighlight)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify);

function tableExists(name: string): boolean {
  return Boolean(
    sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type IN ('table', 'view') AND name = ? LIMIT 1").get(name),
  );
}

function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function normalizeDocsMarkdown(content: string): string {
  const labels: Record<string, string> = {
    NOTE: '📝 说明',
    TIP: '💡 提示',
    IMPORTANT: '❗ 重要',
    WARNING: '⚠️ 警告',
    CAUTION: '🚨 注意',
  };
  return content.replace(
    /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/gim,
    (_match, type: string) => `> **${labels[type.toUpperCase()] ?? type}**`,
  );
}

function safeWrite(distDir: string, relPath: string, html: string): void {
  const fullPath = resolve(distDir, relPath);
  const root = resolve(distDir);
  if (fullPath !== root && !fullPath.startsWith(root + sep)) throw new Error(`路径越界，拒绝写入: ${relPath}`);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, html);
  console.log(`  ✓ ${relPath}`);
}

function stripSeoMeta(html: string): string {
  return html
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');
}

function buildPage(
  template: string,
  meta: { title: string; description?: string | null; canonical: string; jsonLd?: object },
  body: string,
): string {
  const description = meta.description || siteSettings.siteDescription;
  const head = [
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}">`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:url" content="${escapeHtml(meta.canonical)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    meta.jsonLd ? `<script type="application/ld+json">${escapeJsonLd(meta.jsonLd)}</script>` : '',
  ]
    .filter(Boolean)
    .join('\n    ');
  return stripSeoMeta(template)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
    .replace('</head>', `    ${head}\n  </head>`)
    .replace(/<div id="root">[\s\S]*?<\/div>(?=\s*<\/body>)/, `<div id="root">${body}</div>`);
}

function chrome(main: string): string {
  const year = new Date().getFullYear();
  return `<div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-[1320px] items-center gap-5 px-4 sm:px-6">
        <a href="/" class="flex items-center gap-2 font-semibold"><span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-2 text-white">N</span>${escapeHtml(siteSettings.siteTitle)}</a>
        <nav class="hidden items-center gap-1 md:flex"><a href="/docs" class="rounded-lg px-3 py-2 text-sm text-fg">文档</a><a href="/projects" class="rounded-lg px-3 py-2 text-sm text-muted">项目</a><a href="/blog" class="rounded-lg px-3 py-2 text-sm text-muted">博客</a><a href="/about" class="rounded-lg px-3 py-2 text-sm text-muted">关于</a></nav>
      </div>
    </header>
    <main class="flex-1">${main}</main>
    <footer class="border-t border-line"><div class="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6"><span>${escapeHtml(siteSettings.slogan)}</span><span>© ${year} ${escapeHtml(siteSettings.authorName)}</span></div></footer>
  </div>`;
}

function docsHomeBody(spaces: Array<SpaceRow & { version: string; versionLabel: string; count: number }>): string {
  const cards = spaces
    .map(
      (space) => `<a href="/docs/${encodeURIComponent(space.slug)}/${encodeURIComponent(space.version)}" class="group rounded-2xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-brand/60">
        <div class="flex items-start justify-between gap-3"><span class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">N</span><span class="rounded-full border border-line px-2 py-1 text-xs text-muted">${escapeHtml(space.versionLabel)}</span></div>
        <h2 class="mt-5 text-xl font-semibold text-fg">${escapeHtml(space.name)}</h2>
        <p class="mt-2 text-sm leading-6 text-muted">${escapeHtml(space.description || '查看安装、配置、使用与故障排查文档。')}</p>
        <p class="mt-6 text-sm text-brand">${space.count} 篇文档 →</p>
      </a>`,
    )
    .join('');
  return chrome(`<section class="border-b border-line"><div class="mx-auto max-w-[920px] px-4 py-20 text-center"><p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand">NOWEN Documentation</p><h1 class="mt-4 text-4xl font-bold text-fg md:text-5xl">官方文档与帮助中心</h1><p class="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted">查找 NOWEN 项目的快速开始、Docker 与 NAS 部署、功能说明、升级指南和故障排查。</p></div></section><section class="mx-auto max-w-[1120px] px-4 py-14"><div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">${cards || '<p class="col-span-full py-20 text-center text-muted">文档中心正在建设中。</p>'}</div></section>`);
}

function sidebarHtml(space: SpaceRow, version: VersionRow, documents: DocumentRow[], current: DocumentRow): string {
  return `<aside class="border-r border-line bg-bg/40 p-5"><a href="/docs" class="text-xs text-brand">全部文档</a><h2 class="mt-3 font-semibold text-fg">${escapeHtml(space.name)}</h2><p class="mt-1 text-xs text-muted">${escapeHtml(version.label)}</p><nav class="mt-6 space-y-1">${documents
    .map(
      (document) => `<a href="/docs/${encodeURIComponent(space.slug)}/${encodeURIComponent(version.version)}/${document.path.split('/').map(encodeURIComponent).join('/')}" class="block rounded-lg px-3 py-2 text-sm ${document.id === current.id ? 'bg-brand/10 text-brand' : 'text-muted hover:text-fg'}" style="padding-left:${12 + Math.min(document.depth, 5) * 14}px">${escapeHtml(document.title)}</a>`,
    )
    .join('')}</nav></aside>`;
}

async function docPageBody(space: SpaceRow, version: VersionRow, documents: DocumentRow[], document: DocumentRow): Promise<string> {
  const markdown = String(await mdProcessor.process(normalizeDocsMarkdown(document.contentMd || '')));
  const index = documents.findIndex((item) => item.id === document.id);
  const previous = index > 0 ? documents[index - 1] : null;
  const next = index >= 0 && index < documents.length - 1 ? documents[index + 1] : null;
  const navLink = (item: DocumentRow | null, label: string) =>
    item
      ? `<a href="/docs/${encodeURIComponent(space.slug)}/${encodeURIComponent(version.version)}/${item.path.split('/').map(encodeURIComponent).join('/')}" class="rounded-xl border border-line p-4 text-sm text-fg transition hover:border-brand/60"><span class="block text-xs text-muted">${label}</span><span class="mt-1 block font-medium">${escapeHtml(item.title)}</span></a>`
      : '<span></span>';
  return chrome(`<div class="mx-auto grid max-w-[1320px] lg:grid-cols-[280px_minmax(0,820px)]">${sidebarHtml(space, version, documents, document)}<article class="min-w-0 px-5 py-12 sm:px-8 lg:px-12"><div class="mx-auto max-w-[780px]"><nav class="text-xs text-muted"><a href="/docs">文档</a> / <a href="/docs/${encodeURIComponent(space.slug)}/${encodeURIComponent(version.version)}">${escapeHtml(space.name)}</a> / ${escapeHtml(document.title)}</nav><header class="mt-6 border-b border-line pb-8"><span class="rounded-full border border-line px-2 py-1 text-xs text-muted">${escapeHtml(version.label)}</span><h1 class="mt-4 text-4xl font-bold text-fg">${escapeHtml(document.title)}</h1>${document.description ? `<p class="mt-4 text-lg leading-8 text-muted">${escapeHtml(document.description)}</p>` : ''}<div class="mt-4 text-xs text-muted">最后更新：${escapeHtml(new Date(document.updatedAt).toLocaleDateString('zh-CN'))}${document.editUrl ? ` · <a class="text-brand" href="${escapeHtml(document.editUrl)}" target="_blank" rel="noreferrer">在 GitHub 编辑</a>` : ''}</div></header><div class="prose dark:prose-invert mt-8 max-w-none prose-headings:font-semibold prose-a:text-brand">${markdown}</div><nav class="mt-12 grid gap-3 sm:grid-cols-2">${navLink(previous, '上一篇')}${navLink(next, '下一篇')}</nav></div></article></div>`);
}

async function main(): Promise<void> {
  if (!tableExists('doc_spaces') || !tableExists('documents')) {
    console.log('[prerender-docs] 文档表尚未创建，跳过文档预渲染。');
    return;
  }
  const distDir = resolve(process.env.DIST_DIR ? resolve(process.env.DIST_DIR) : resolve(process.cwd(), '../web/dist'));
  const templatePath = join(distDir, 'index.html');
  if (!existsSync(templatePath)) throw new Error(`未找到 ${templatePath}`);
  const template = readFileSync(templatePath, 'utf-8');
  const spaces = sqlite
    .prepare(`SELECT id, name, slug, description, icon_url AS iconUrl, updated_at AS updatedAt FROM doc_spaces WHERE is_published = 1 ORDER BY sort_order ASC, updated_at DESC`)
    .all() as SpaceRow[];
  const homeSpaces: Array<SpaceRow & { version: string; versionLabel: string; count: number }> = [];
  let pageCount = 0;

  for (const space of spaces) {
    const versions = sqlite
      .prepare(`SELECT id, space_id AS spaceId, version, label FROM doc_versions WHERE space_id = ? AND status = 'published' ORDER BY is_default DESC, sort_order ASC, created_at DESC`)
      .all(space.id) as VersionRow[];
    const defaultVersion = versions[0];
    if (defaultVersion) {
      const count = (sqlite.prepare(`SELECT COUNT(*) AS total FROM documents WHERE space_id = ? AND version_id = ? AND status = 'published' AND visibility = 'public'`).get(space.id, defaultVersion.id) as { total: number }).total;
      homeSpaces.push({ ...space, version: defaultVersion.version, versionLabel: defaultVersion.label, count });
    }
    for (const version of versions) {
      const documents = sqlite
        .prepare(`SELECT id, space_id AS spaceId, version_id AS versionId, parent_id AS parentId, title, path, description, content_md AS contentMd, edit_url AS editUrl, seo_title AS seoTitle, seo_description AS seoDescription, sort_order AS sortOrder, depth, published_at AS publishedAt, updated_at AS updatedAt FROM documents WHERE space_id = ? AND version_id = ? AND status = 'published' AND visibility = 'public' ORDER BY depth ASC, sort_order ASC, title COLLATE NOCASE ASC`)
        .all(space.id, version.id) as DocumentRow[];
      for (const document of documents) {
        const routePath = `/docs/${space.slug}/${version.version}/${document.path}`;
        const outputPath = `docs/${encodeURIComponent(space.slug)}/${encodeURIComponent(version.version)}/${document.path.split('/').map(encodeURIComponent).join('/')}/index.html`;
        safeWrite(
          distDir,
          outputPath,
          buildPage(
            template,
            {
              title: `${document.seoTitle || document.title} - ${space.name}`,
              description: document.seoDescription || document.description || space.description,
              canonical: absoluteUrl(routePath),
              jsonLd: {
                '@context': 'https://schema.org',
                '@type': 'TechArticle',
                headline: document.seoTitle || document.title,
                description: document.seoDescription || document.description || space.description,
                datePublished: document.publishedAt,
                dateModified: document.updatedAt,
                mainEntityOfPage: absoluteUrl(routePath),
              },
            },
            await docPageBody(space, version, documents, document),
          ),
        );
        pageCount += 1;
      }
      if (documents[0]) {
        const redirectBody = await docPageBody(space, version, documents, documents[0]);
        safeWrite(
          distDir,
          `docs/${encodeURIComponent(space.slug)}/${encodeURIComponent(version.version)}/index.html`,
          buildPage(
            template,
            {
              title: `${space.name} 文档`,
              description: space.description,
              canonical: absoluteUrl(`/docs/${space.slug}/${version.version}/${documents[0].path}`),
            },
            redirectBody,
          ),
        );
      }
    }
  }

  safeWrite(
    distDir,
    'docs/index.html',
    buildPage(
      template,
      {
        title: `官方文档 - ${siteSettings.siteTitle}`,
        description: 'NOWEN 项目的安装、部署、使用指南、功能说明与故障排查文档。',
        canonical: absoluteUrl('/docs'),
        jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'NOWEN 官方文档', url: absoluteUrl('/docs') },
      },
      docsHomeBody(homeSpaces),
    ),
  );
  console.log(`[prerender-docs] 完成：生成 ${pageCount} 篇文档静态页。`);
}

main().catch((error) => {
  console.error('[prerender-docs] 失败：', error);
  process.exit(1);
});
