import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import type { SiteSettings } from '@blog/shared';
import { siteSettings as defaultSettings } from '../config/site';
import { absoluteUrl } from '../lib/seo';
import { toSummary } from '../lib/mapping';
import { listPublishedForPrerender } from '../modules/posts/posts.repository';
import { listHelpCenters } from '../modules/docs/help-centers.service';
import { getSiteSettings } from '../modules/settings/settings.service';

function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function currentSettings(): SiteSettings {
  try {
    return getSiteSettings();
  } catch {
    return defaultSettings;
  }
}

function shell(settings: SiteSettings, body: string): string {
  return `<div class="flex min-h-screen flex-col" style="--color-primary:${escapeHtml(settings.themeColor)};--brand:${escapeHtml(settings.themeColor)}">
    <header class="border-b border-line bg-bg/80 backdrop-blur"><div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8"><a href="/" class="font-semibold">${escapeHtml(settings.siteTitle)}</a><nav class="flex gap-4 text-sm text-muted"><a href="/docs">帮助中心</a><a href="/projects">项目</a><a href="/blog">博客</a></nav></div></header>
    <main class="flex-1">${body}</main>
    <footer class="border-t border-line"><div class="mx-auto max-w-6xl px-4 py-10 text-sm text-muted sm:px-6 lg:px-8">© ${new Date().getFullYear()} ${escapeHtml(settings.authorName)} · ${escapeHtml(settings.footerText || settings.slogan)}</div></footer>
  </div>`;
}

function centerCard(center: ReturnType<typeof listHelpCenters>[number]): string {
  return `<a href="/docs/${encodeURIComponent(center.slug)}" class="nowen-card flex min-h-60 flex-col p-6">
    <div class="flex items-center justify-between gap-3"><span class="text-sm font-semibold text-[var(--color-primary)]">帮助中心</span><span class="text-xs text-[var(--color-text-muted)]">${center.documentCount} 篇文档</span></div>
    <h3 class="mt-6 text-xl font-semibold tracking-tight">${escapeHtml(center.name)}</h3>
    <p class="mt-3 line-clamp-4 text-sm leading-6 text-[var(--color-text-secondary)]">${escapeHtml(center.description || '查看安装、配置、功能使用和常见问题。')}</p>
    <span class="mt-auto pt-6 text-sm font-medium text-[var(--color-primary)]">打开帮助中心 →</span>
  </a>`;
}

function postCard(post: ReturnType<typeof toSummary>): string {
  return `<a href="/blog/${encodeURIComponent(post.slug)}" class="nowen-card flex min-h-52 flex-col p-6">
    <h3 class="text-lg font-semibold tracking-tight">${escapeHtml(post.title)}</h3>
    ${post.summary ? `<p class="mt-3 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">${escapeHtml(post.summary)}</p>` : ''}
    <div class="mt-auto flex items-center gap-3 pt-5 text-xs text-[var(--color-text-muted)]"><span>${post.readingTime} 分钟</span><span>${post.viewCount} 阅读</span></div>
  </a>`;
}

function homeBody(settings: SiteSettings, centers: ReturnType<typeof listHelpCenters>, posts: ReturnType<typeof toSummary>[]): string {
  const documentTotal = centers.reduce((total, center) => total + center.documentCount, 0);
  return shell(settings, `<div class="relative isolate overflow-hidden">
    <section class="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-8">
      <div><p class="nowen-eyebrow">项目帮助中心 · AI 文档</p><h1 class="mt-5 text-5xl font-semibold leading-tight tracking-[-0.05em]">找到项目<br><span class="text-[var(--color-primary)]">直接解决问题</span></h1><p class="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">${escapeHtml(settings.siteDescription)}</p><div class="mt-8 flex gap-3"><a href="/docs" class="nowen-button-primary px-5 py-3">打开帮助中心</a><a href="/blog" class="nowen-button-secondary px-5 py-3">阅读博客</a></div></div>
      <div class="nowen-surface p-6"><p class="font-semibold">内容概览</p><div class="mt-5 grid grid-cols-3 gap-3"><div class="nowen-stat p-4 text-center"><strong class="text-2xl">${centers.length}</strong><p class="text-xs text-muted">项目</p></div><div class="nowen-stat p-4 text-center"><strong class="text-2xl">${documentTotal}</strong><p class="text-xs text-muted">文档</p></div><div class="nowen-stat p-4 text-center"><strong class="text-2xl">${posts.length}</strong><p class="text-xs text-muted">文章</p></div></div></div>
    </section>
    <section class="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8"><p class="nowen-eyebrow">Help centers</p><h2 class="mt-3 text-3xl font-semibold">选择项目，直接解决问题</h2><div class="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">${centers.slice(0, 6).map(centerCard).join('') || '<div class="nowen-surface border-dashed p-10 text-center text-muted md:col-span-2 lg:col-span-3">后台创建项目后会显示在这里。</div>'}</div></section>
    <section class="border-t border-line bg-[var(--color-bg-secondary)]"><div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8"><p class="nowen-eyebrow">Blog</p><h2 class="mt-3 text-3xl font-semibold">开发日志与技术文章</h2><div class="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">${posts.slice(0, 6).map(postCard).join('')}</div></div></section>
  </div>`);
}

function projectsBody(settings: SiteSettings, centers: ReturnType<typeof listHelpCenters>): string {
  return shell(settings, `<div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8"><p class="nowen-eyebrow">Project help centers</p><h1 class="mt-3 text-4xl font-semibold tracking-tight">项目与帮助中心</h1><p class="mt-4 text-[var(--color-text-secondary)]">每个项目只有一个帮助中心，集中查看安装、配置和使用说明。</p><div class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">${centers.map(centerCard).join('')}</div></div>`);
}

function stripSeo(html: string): string {
  return html
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '');
}

function buildPage(template: string, title: string, description: string, path: string, body: string): string {
  const canonical = absoluteUrl(path);
  let html = stripSeo(template);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = html.replace('</head>', `<meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"></head>`);
  return html.replace(/<div id="root">[\s\S]*?<\/div>(?=\s*<\/body>)/, `<div id="root">${body}</div>`);
}

function safeWrite(distDir: string, relativePath: string, content: string): void {
  const fullPath = resolve(distDir, relativePath);
  const root = resolve(distDir);
  if (fullPath !== root && !fullPath.startsWith(root + sep)) throw new Error('预渲染路径越界');
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

async function main(): Promise<void> {
  const distDir = resolve(process.env.DIST_DIR ? resolve(process.env.DIST_DIR) : resolve(process.cwd(), '../web/dist'));
  const templatePath = existsSync(join(distDir, '200.html')) ? join(distDir, '200.html') : join(distDir, 'index.html');
  if (!existsSync(templatePath)) throw new Error(`未找到预渲染模板: ${templatePath}`);
  const template = readFileSync(templatePath, 'utf8');
  const settings = currentSettings();
  const posts = (await listPublishedForPrerender()).map(toSummary);
  const centers = listHelpCenters(true);

  safeWrite(distDir, 'index.html', buildPage(template, settings.defaultSeoTitle || settings.siteTitle, settings.defaultSeoDescription || settings.siteDescription, '/', homeBody(settings, centers, posts)));
  safeWrite(distDir, 'projects/index.html', buildPage(template, `项目 - ${settings.siteTitle}`, '选择项目并查看官方帮助中心。', '/projects', projectsBody(settings, centers)));
  console.log('[prerender] 已更新项目帮助中心首页和项目页');
}

void main();
