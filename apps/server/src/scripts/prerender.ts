/**
 * BLOG-10.3：构建期预渲染（路径 A —— 轻量模板生成）。
 *
 * 不运行 React renderToString / hydrateRoot / SSR；直接读取 SQLite 中的
 * published + public 内容，用 unified + remark + rehype 管线（与线上
 * react-markdown 同款 sanitize 策略）渲染正文，生成带真实 <head> meta、
 * JSON-LD、正文的静态 HTML 到 apps/web/dist。
 *
 * 数据过滤与 RSS/Sitemap 完全一致：status='published' AND visibility='public'。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname, sep } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { defaultSchema, type Schema } from 'hast-util-sanitize';

import { siteSettings } from '../config/site';
import { absoluteUrl } from '../lib/seo';
import { listPublishedForPrerender } from '../modules/posts/posts.repository';
import { listCategories, listTags, getArchive } from '../modules/taxonomies/taxonomies.service';
import { toSummary, type PostRow } from '../lib/mapping';
import type { PostSummary, Category, Tag } from '@blog/shared';
import type { CategoryView, TagView, ArchiveYear } from '../modules/taxonomies/taxonomies.service';

/* ------------------------------- Markdown ------------------------------- */

// 与 apps/web/src/components/markdown/Markdown.tsx 一致：允许 highlight.js 注入的
// className，既保留代码高亮又防 XSS（rehype-sanitize 默认会剥离 className）。
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

async function renderMarkdown(md: string): Promise<string> {
  const file = await mdProcessor.process(md ?? '');
  return String(file);
}

/* ------------------------------- helpers -------------------------------- */

function escapeHtml(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// JSON-LD 写入 <script> 时须转义 '<'，避免 </script> 提前闭合造成注入。
function escapeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatMonth(m: number): string {
  return `${m}月`;
}

/* ------------------------------- chrome --------------------------------- */

const NAV = [
  { to: '/posts', label: '文章' },
  { to: '/categories', label: '分类' },
  { to: '/tags', label: '标签' },
  { to: '/archive', label: '归档' },
  { to: '/about', label: '关于' },
  { to: '/search', label: '搜索' },
];

function headerHtml(): string {
  const nav = NAV.map(
    (n) =>
      `<a href="${n.to}" class="rounded-lg px-3 py-2 text-sm text-muted transition hover:text-fg">${escapeHtml(n.label)}</a>`,
  ).join('');
  return `<header class="sticky top-0 z-50 border-b border-line bg-bg/80 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-[1120px] items-center gap-4 px-4">
        <a href="/" class="flex items-center gap-2 font-semibold">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-2 text-white">N</span>
          <span>${escapeHtml(siteSettings.siteTitle)}</span>
        </a>
        <nav class="hidden items-center gap-1 md:flex">${nav}</nav>
      </div>
    </header>`;
}

function footerHtml(): string {
  const year = new Date().getFullYear();
  const social: string[] = [];
  if (siteSettings.social.github)
    social.push(
      `<a href="${escapeHtml(siteSettings.social.github)}" target="_blank" rel="noreferrer">GitHub</a>`,
    );
  if (siteSettings.social.email)
    social.push(`<a href="mailto:${escapeHtml(siteSettings.social.email)}">Email</a>`);
  if (siteSettings.social.rss)
    social.push(`<a href="/rss.xml" target="_blank" rel="noreferrer">RSS</a>`);
  social.push(`<a href="/sitemap.xml" target="_blank" rel="noreferrer">Sitemap</a>`);
  return `<footer class="border-t border-line">
      <div class="mx-auto flex max-w-[1120px] flex-col gap-4 px-4 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div>
          <p class="font-medium text-fg">${escapeHtml(siteSettings.siteTitle)}</p>
          <p>${escapeHtml(siteSettings.slogan)}</p>
        </div>
        <div class="flex gap-4">${social.join('')}</div>
        <p>© ${year} ${escapeHtml(siteSettings.authorName)}${siteSettings.icp ? ` · ${escapeHtml(siteSettings.icp)}` : ''}</p>
      </div>
    </footer>`;
}

function shell(mainHtml: string): string {
  return `<div class="flex min-h-screen flex-col">
      ${headerHtml()}
      <main class="flex-1">${mainHtml}</main>
      ${footerHtml()}
    </div>`;
}

/* ------------------------------- cards ---------------------------------- */

function cardHtml(p: PostSummary, featured = false): string {
  const cats = p.categories
    .map(
      (c) =>
        `<span class="rounded-full border border-line px-2 py-0.5"${c.color ? ` style="color:${escapeHtml(c.color)}"` : ''}>${escapeHtml(c.name)}</span>`,
    )
    .join('');
  const cover = p.coverUrl
    ? `<div class="aspect-[16/9] overflow-hidden"><img src="${escapeHtml(p.coverUrl)}" alt="${escapeHtml(p.title)}" loading="lazy" class="h-full w-full object-cover transition duration-300 group-hover:scale-105"></div>`
    : '';
  const desc = p.summary
    ? `<p class="mt-2 line-clamp-2 text-sm text-muted">${escapeHtml(p.summary)}</p>`
    : '';
  const date = formatDate(p.publishedAt);
  return `<a href="/posts/${encodeURIComponent(p.slug)}" class="group block overflow-hidden rounded-card border border-line bg-surface transition hover:-translate-y-0.5 hover:border-brand/60${featured ? ' md:col-span-2' : ''}">
      ${cover}
      <div class="p-5">
        <div class="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">${cats}</div>
        <h3 class="text-lg font-semibold text-fg transition group-hover:text-brand">${escapeHtml(p.title)}</h3>
        ${desc}
        <div class="mt-4 flex items-center gap-3 text-xs text-muted">
          <span>${escapeHtml(date)}</span>
          <span>${p.readingTime} 分钟</span>
          <span>${p.viewCount} 阅读</span>
        </div>
      </div>
    </a>`;
}

/* ----------------------------- page bodies ------------------------------ */

function homeBody(posts: PostSummary[]): string {
  const featured = posts.filter((p) => p.isFeatured).slice(0, 2);
  const latest = posts.slice(0, 9);
  const featuredGrid = featured.length
    ? `<div class="grid gap-6 md:grid-cols-2">${featured.map((p) => cardHtml(p, true)).join('')}</div>`
    : '';
  const latestGrid = `<div class="grid gap-6 md:grid-cols-3">${latest.map((p) => cardHtml(p)).join('')}</div>`;
  const main = `<div>
      <section class="border-b border-line">
        <div class="mx-auto max-w-[1120px] px-4 py-20 text-center">
          <h1 class="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-4xl font-bold text-transparent md:text-6xl">${escapeHtml(siteSettings.siteTitle)}</h1>
          <p class="mx-auto mt-4 max-w-xl text-muted">${escapeHtml(siteSettings.slogan)}</p>
          <div class="mt-8 flex justify-center gap-3">
            <a href="/posts" class="rounded-lg bg-gradient-to-r from-brand to-brand-2 px-5 py-2.5 text-white transition hover:opacity-90">阅读文章</a>
            <a href="/about" class="rounded-lg border border-line px-5 py-2.5 transition hover:border-brand/60">关于我</a>
          </div>
        </div>
      </section>
      <section class="mx-auto max-w-[1120px] px-4 py-12">
        ${featured.length ? `<h2 class="mb-6 text-xl font-semibold">精选文章</h2>${featuredGrid}` : ''}
        <h2 class="mb-6 mt-14 text-xl font-semibold">最新文章</h2>
        ${latestGrid}
      </section>
    </div>`;
  return shell(main);
}

function postsListBody(posts: PostSummary[], heading = '文章'): string {
  const grid = `<div class="grid gap-6 md:grid-cols-3">${posts.map((p) => cardHtml(p)).join('')}</div>`;
  const main = `<div class="mx-auto max-w-[1120px] px-4 py-12">
      <h1 class="mb-8 text-2xl font-bold">${escapeHtml(heading)}</h1>
      ${grid}
    </div>`;
  return shell(main);
}

function categoriesBody(categories: CategoryView[]): string {
  const items = categories
    .map(
      (c) => `<a href="/categories/${encodeURIComponent(c.slug)}" class="rounded-card border border-line bg-surface p-5 transition hover:border-brand/60">
        <div class="flex items-center justify-between">
          <span class="text-lg font-semibold"${c.color ? ` style="color:${escapeHtml(c.color)}"` : ''}>${escapeHtml(c.name)}</span>
          <span class="text-sm text-muted">${c.postCount}</span>
        </div>
        ${c.description ? `<p class="mt-2 text-sm text-muted">${escapeHtml(c.description)}</p>` : ''}
      </a>`,
    )
    .join('');
  const main = `<div class="mx-auto max-w-[1120px] px-4 py-12">
      <h1 class="mb-8 text-2xl font-bold">分类</h1>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${items}</div>
    </div>`;
  return shell(main);
}

function tagsBody(tags: TagView[]): string {
  const items = tags
    .map(
      (t) => `<a href="/tags/${encodeURIComponent(t.slug)}" class="rounded-full border border-line bg-surface px-4 py-2 text-sm transition hover:border-brand/60"${t.color ? ` style="color:${escapeHtml(t.color)}"` : ''}>
        ${escapeHtml(t.name)}<span class="ml-1 text-muted">${t.postCount}</span>
      </a>`,
    )
    .join('');
  const main = `<div class="mx-auto max-w-[1120px] px-4 py-12">
      <h1 class="mb-8 text-2xl font-bold">标签</h1>
      <div class="flex flex-wrap gap-3">${items}</div>
    </div>`;
  return shell(main);
}

function archiveBody(groups: ArchiveYear[]): string {
  const sections = groups
    .map((g) => {
      const months = g.months
        .map((m) => {
          const items = m.posts
            .map(
              (p) =>
                `<li><a href="/posts/${encodeURIComponent(p.slug)}" class="text-fg transition hover:text-brand">${escapeHtml(p.title)}</a></li>`,
            )
            .join('');
          return `<div class="mb-6"><h3 class="mb-2 text-sm text-muted">${escapeHtml(formatMonth(m.month))}</h3><ul class="space-y-1.5">${items}</ul></div>`;
        })
        .join('');
      return `<section class="mb-10"><h2 class="mb-4 text-xl font-semibold text-brand">${g.year} <span class="text-sm text-muted">(${g.total})</span></h2>${months}</section>`;
    })
    .join('');
  const main = `<div class="mx-auto max-w-[1120px] px-4 py-12"><h1 class="mb-8 text-2xl font-bold">归档</h1>${sections}</div>`;
  return shell(main);
}

function searchBody(): string {
  const main = `<div class="mx-auto max-w-[760px] px-4 py-16">
      <h1 class="text-3xl font-bold">搜索</h1>
      <p class="mt-2 text-muted">输入关键词开始搜索。</p>
      <form class="mt-6 flex items-center gap-2" action="/search" method="get">
        <input name="q" placeholder="搜索" class="w-full rounded-lg border border-line bg-surface py-2 px-3 text-sm outline-none transition focus:border-brand" />
        <button type="submit" class="rounded-lg border border-line px-4 py-2 text-sm transition hover:border-brand/60">搜索</button>
      </form>
    </div>`;
  return shell(main);
}

function aboutBody(): string {
  const s = siteSettings;
  const contacts: string[] = [];
  if (s.social.github)
    contacts.push(
      `<li>GitHub：<a class="text-brand" href="${escapeHtml(s.social.github)}" target="_blank" rel="noreferrer">${escapeHtml(s.social.github)}</a></li>`,
    );
  if (s.social.email)
    contacts.push(
      `<li>Email：<a class="text-brand" href="mailto:${escapeHtml(s.social.email)}">${escapeHtml(s.social.email)}</a></li>`,
    );
  const main = `<div class="mx-auto max-w-[760px] px-4 py-16">
      <h1 class="text-3xl font-bold">${escapeHtml(s.authorName)}</h1>
      <p class="mt-2 text-muted">${escapeHtml(s.siteDescription)}</p>
      <div class="mt-10 space-y-6 text-fg/90">
        <section><h2 class="mb-2 text-lg font-semibold">我是谁</h2><p class="text-muted">一名关注前端工程化、Node.js 与开源的全栈工程师，喜欢把想法写成代码和文章。</p></section>
        <section><h2 class="mb-2 text-lg font-semibold">我关注什么</h2><p class="text-muted">React 生态、类型安全、开发者体验，以及内容创作本身。</p></section>
        ${contacts.length ? `<section><h2 class="mb-2 text-lg font-semibold">联系方式</h2><ul class="space-y-1 text-muted">${contacts.join('')}</ul></section>` : ''}
      </div>
    </div>`;
  return shell(main);
}

async function postDetailBody(row: PostRow): Promise<string> {
  const p = toSummary(row);
  const cats = p.categories
    .map(
      (c) =>
        `<a href="/categories/${encodeURIComponent(c.slug)}" class="rounded-full border border-line px-2 py-0.5 text-muted transition hover:text-brand"${c.color ? ` style="color:${escapeHtml(c.color)}"` : ''}>${escapeHtml(c.name)}</a>`,
    )
    .join('');
  const bodyHtml = await renderMarkdown(row.contentMd);
  const tags = p.tags
    .map(
      (t) =>
        `<a href="/tags/${encodeURIComponent(t.slug)}" class="rounded-full border border-line px-3 py-1 text-sm text-muted transition hover:text-brand"${t.color ? ` style="color:${escapeHtml(t.color)}"` : ''}>${escapeHtml(t.name)}</a>`,
    )
    .join('');
  const main = `<article class="mx-auto max-w-[760px] px-4 py-12">
      <div class="mb-3 flex flex-wrap gap-2 text-xs">${cats}</div>
      <h1 class="text-3xl font-bold text-fg">${escapeHtml(p.title)}</h1>
      <div class="mt-3 flex flex-wrap gap-3 text-sm text-muted">
        <span>${escapeHtml(p.author.username)}</span>
        <span>${escapeHtml(formatDate(p.publishedAt))}</span>
        <span>${p.readingTime} 分钟阅读</span>
        <span>${p.viewCount} 阅读</span>
      </div>
      <hr class="my-6 border-line" />
      <div class="prose dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-brand">${bodyHtml}</div>
      ${p.tags.length ? `<div class="mt-10 flex flex-wrap gap-2">${tags}</div>` : ''}
    </article>`;
  return shell(main);
}

/* ------------------------------ HTML 组装 ------------------------------- */

interface PageMeta {
  title: string;
  description?: string | null;
  canonical: string;
  ogType?: string;
  ogImage?: string | null;
  jsonLd?: object | null;
}

function buildHead(meta: PageMeta): string {
  const parts: string[] = [];
  parts.push(`<meta name="description" content="${escapeHtml(meta.description)}">`);
  parts.push(`<link rel="canonical" href="${escapeHtml(meta.canonical)}">`);
  parts.push(`<meta property="og:title" content="${escapeHtml(meta.title)}">`);
  if (meta.description)
    parts.push(`<meta property="og:description" content="${escapeHtml(meta.description)}">`);
  parts.push(`<meta property="og:type" content="${escapeHtml(meta.ogType ?? 'website')}">`);
  parts.push(`<meta property="og:url" content="${escapeHtml(meta.canonical)}">`);
  if (meta.ogImage) parts.push(`<meta property="og:image" content="${escapeHtml(meta.ogImage)}">`);
  parts.push(`<meta name="twitter:card" content="summary_large_image">`);
  parts.push(`<meta name="twitter:title" content="${escapeHtml(meta.title)}">`);
  if (meta.description)
    parts.push(`<meta name="twitter:description" content="${escapeHtml(meta.description)}">`);
  if (meta.ogImage) parts.push(`<meta name="twitter:image" content="${escapeHtml(meta.ogImage)}">`);
  parts.push(`<meta name="theme-color" content="${escapeHtml(siteSettings.themeColor)}">`);
  if (meta.jsonLd)
    parts.push(`<script type="application/ld+json">${escapeJsonLd(meta.jsonLd)}</script>`);
  return parts.join('\n    ');
}

function buildPage(template: string, meta: PageMeta, bodyHtml: string): string {
  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
  html = html.replace('</head>', `    ${buildHead(meta)}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);
  return html;
}

function pageMeta(path: string, title: string, description?: string | null): PageMeta {
  return {
    title,
    description: description ?? siteSettings.siteDescription,
    canonical: absoluteUrl(path),
    ogType: 'website',
    ogImage: siteSettings.logoUrl ? absoluteUrl(siteSettings.logoUrl) : null,
  };
}

/** 安全写入：解析后必须仍在 distDir 内，防止路径穿越写出目录。 */
function safeWrite(distDir: string, relPath: string, html: string): void {
  const full = resolve(distDir, relPath);
  const distRoot = resolve(distDir);
  if (full !== distRoot && !full.startsWith(distRoot + sep)) {
    throw new Error(`路径越界，拒绝写入: ${relPath}`);
  }
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, html);
  console.log(`  ✓ ${relPath}`);
}

/* -------------------------------- main ---------------------------------- */

async function main(): Promise<void> {
  const distDir = resolve(
    process.env.DIST_DIR ? resolve(process.env.DIST_DIR) : resolve(process.cwd(), '../web/dist'),
  );
  const templatePath = join(distDir, 'index.html');
  if (!existsSync(templatePath)) {
    console.error(`[prerender] 未找到 ${templatePath}，请先运行 pnpm --filter @blog/web build`);
    process.exit(1);
  }
  const template = readFileSync(templatePath, 'utf-8');

  // 保留原始 SPA 壳作为静态层回退（/admin、客户端路由等）。
  writeFileSync(join(distDir, '200.html'), template);
  console.log('[prerender] 已写入 SPA fallback: 200.html');

  const [posts, categories, tags, archive] = await Promise.all([
    listPublishedForPrerender(),
    listCategories(),
    listTags(),
    getArchive(),
  ]);
  const summaries = posts.map(toSummary);
  const base = absoluteUrl('/');

  // 首页
  safeWrite(
    distDir,
    'index.html',
    buildPage(
      template,
      {
        title: siteSettings.siteTitle,
        description: siteSettings.siteDescription,
        canonical: base,
        ogType: 'website',
        ogImage: siteSettings.logoUrl ? absoluteUrl(siteSettings.logoUrl) : null,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: siteSettings.siteTitle,
          url: base,
          description: siteSettings.siteDescription,
        },
      },
      homeBody(summaries),
    ),
  );

  // 文章列表
  safeWrite(
    distDir,
    'posts/index.html',
    buildPage(template, pageMeta('/posts', `文章 - ${siteSettings.siteTitle}`), postsListBody(summaries)),
  );

  // 文章详情（逐篇）
  for (const row of posts) {
    const p = toSummary(row);
    const detail = await postDetailBody(row);
    safeWrite(
      distDir,
      `posts/${encodeURIComponent(row.slug)}/index.html`,
      buildPage(
        template,
        {
          title: row.seoTitle || row.title,
          description: row.seoDescription || row.summary,
          canonical: row.canonicalUrl ? absoluteUrl(row.canonicalUrl) : absoluteUrl(`/posts/${row.slug}`),
          ogType: 'article',
          ogImage: row.coverUrl ? absoluteUrl(row.coverUrl) : null,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: row.seoTitle || row.title,
            ...(row.seoDescription || row.summary
              ? { description: row.seoDescription || row.summary }
              : {}),
            ...(row.coverUrl ? { image: absoluteUrl(row.coverUrl) } : {}),
            author: { '@type': 'Person', name: row.author.username },
            ...(row.publishedAt ? { datePublished: row.publishedAt } : {}),
            ...(row.updatedAt ? { dateModified: row.updatedAt } : {}),
            mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/posts/${row.slug}`) },
            url: absoluteUrl(`/posts/${row.slug}`),
          },
        },
        detail,
      ),
    );
  }

  // 分类
  safeWrite(
    distDir,
    'categories/index.html',
    buildPage(template, pageMeta('/categories', `分类 - ${siteSettings.siteTitle}`), categoriesBody(categories)),
  );
  for (const c of categories) {
    const filtered = summaries.filter((p) => p.categories.some((x) => x.slug === c.slug));
    safeWrite(
      distDir,
      `categories/${encodeURIComponent(c.slug)}/index.html`,
      buildPage(
        template,
        pageMeta(`/categories/${c.slug}`, `分类：${c.name} - ${siteSettings.siteTitle}`, c.description),
        postsListBody(filtered, `分类：${c.name}`),
      ),
    );
  }

  // 标签
  safeWrite(
    distDir,
    'tags/index.html',
    buildPage(template, pageMeta('/tags', `标签 - ${siteSettings.siteTitle}`), tagsBody(tags)),
  );
  for (const t of tags) {
    const filtered = summaries.filter((p) => p.tags.some((x) => x.slug === t.slug));
    safeWrite(
      distDir,
      `tags/${encodeURIComponent(t.slug)}/index.html`,
      buildPage(
        template,
        pageMeta(`/tags/${t.slug}`, `标签：${t.name} - ${siteSettings.siteTitle}`),
        postsListBody(filtered, `标签：${t.name}`),
      ),
    );
  }

  // 归档
  safeWrite(
    distDir,
    'archive/index.html',
    buildPage(template, pageMeta('/archive', `归档 - ${siteSettings.siteTitle}`), archiveBody(archive)),
  );

  // 搜索（仅空页面壳，不生成具体结果）
  safeWrite(
    distDir,
    'search/index.html',
    buildPage(template, pageMeta('/search', `搜索 - ${siteSettings.siteTitle}`), searchBody()),
  );

  // 关于
  safeWrite(
    distDir,
    'about/index.html',
    buildPage(template, pageMeta('/about', `关于 - ${siteSettings.siteTitle}`), aboutBody()),
  );

  console.log(`\n[prerender] 完成：共生成 ${posts.length} 篇文章 + 公开列表/分类/标签/归档/搜索/关于 静态页。`);
}

main().catch((err) => {
  console.error('[prerender] 失败：', err);
  process.exit(1);
});
