import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Project, SiteSettings } from '@blog/shared';
import { sqlite } from '../db/client';
import { absoluteUrl } from '../lib/seo';
import { siteSettings as defaultSettings } from '../config/site';
import { getSiteSettings } from '../modules/settings/settings.service';
import { listPublicProjects } from '../modules/projects/projects.service';
import { listPublishedForPrerender } from '../modules/posts/posts.repository';

interface DocSpaceCard {
  name: string;
  slug: string;
  description: string | null;
  version: string;
  versionLabel: string;
  documentCount: number;
}

function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function settings(): SiteSettings {
  try {
    return getSiteSettings();
  } catch {
    return defaultSettings;
  }
}

function docsSpaces(): DocSpaceCard[] {
  const exists = sqlite
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'doc_spaces' LIMIT 1")
    .get();
  if (!exists) return [];
  return sqlite
    .prepare(
      `SELECT s.name, s.slug, s.description,
              v.version, v.label AS versionLabel,
              (SELECT COUNT(*) FROM documents d WHERE d.space_id = s.id AND d.version_id = v.id AND d.status = 'published' AND d.visibility = 'public') AS documentCount
         FROM doc_spaces s
         JOIN doc_versions v ON v.id = (
           SELECT dv.id FROM doc_versions dv
            WHERE dv.space_id = s.id AND dv.status = 'published'
            ORDER BY dv.is_default DESC, dv.sort_order ASC, dv.created_at DESC LIMIT 1
         )
        WHERE s.is_published = 1
        ORDER BY s.sort_order ASC, s.updated_at DESC
        LIMIT 6`,
    )
    .all() as DocSpaceCard[];
}

function projectCard(project: Project): string {
  const topics = project.topics
    .slice(0, 3)
    .map((topic) => `<span class="rounded-full border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)]">${escapeHtml(topic)}</span>`)
    .join('');
  return `<article class="flex min-h-64 flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-6">
    <div class="flex items-start justify-between"><span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-bg-tertiary)] text-[var(--color-primary)]">N</span>${project.stars ? `<span class="text-xs text-[var(--color-text-muted)]">★ ${project.stars}</span>` : ''}</div>
    <h3 class="mt-5 text-xl font-semibold">${escapeHtml(project.name)}</h3>
    <p class="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">${escapeHtml(project.description || 'NOWEN 开源项目')}</p>
    <div class="mt-auto flex flex-wrap gap-2 pt-6">${project.language ? `<span class="rounded-full border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)]">${escapeHtml(project.language)}</span>` : ''}${topics}</div>
    <div class="mt-5 flex gap-3">${project.homepageUrl ? `<a class="text-sm font-medium text-[var(--color-primary)]" href="${escapeHtml(project.homepageUrl)}">访问项目</a>` : ''}${project.repositoryUrl ? `<a class="text-sm text-[var(--color-text-secondary)]" href="${escapeHtml(project.repositoryUrl)}">GitHub</a>` : ''}</div>
  </article>`;
}

function body(current: SiteSettings, spaces: DocSpaceCard[], projects: Project[], postCount: number): string {
  const docs = spaces
    .map(
      (space) => `<a href="/docs/${encodeURIComponent(space.slug)}/${encodeURIComponent(space.version)}" class="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-6 transition hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--color-primary)_42%,var(--color-border))]">
        <div class="flex items-center justify-between"><span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">D</span><span class="text-xs text-[var(--color-text-muted)]">${escapeHtml(space.versionLabel)}</span></div>
        <h3 class="mt-5 text-xl font-semibold">${escapeHtml(space.name)}</h3>
        <p class="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">${escapeHtml(space.description || '查看项目安装、配置与使用说明。')}</p>
        <p class="mt-5 text-sm font-medium text-[var(--color-primary)]">${space.documentCount} 篇文档 →</p>
      </a>`,
    )
    .join('');
  const projectCards = projects.slice(0, 3).map(projectCard).join('');
  return `<div class="flex min-h-screen flex-col" style="--color-primary:${escapeHtml(current.themeColor)};--brand:${escapeHtml(current.themeColor)}">
    <header class="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-xl"><div class="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8"><a href="/" class="font-semibold">${escapeHtml(current.siteTitle)}</a><nav class="hidden gap-5 text-sm text-muted md:flex"><a href="/docs">文档</a><a href="/projects">项目</a><a href="/blog">博客</a><a href="/about">关于</a></nav></div></header>
    <main class="flex-1">
      <section class="border-b border-[var(--color-border)]"><div class="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-8 lg:py-28"><div><span class="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-primary)]">开源产品 · 官方文档 · 持续维护</span><h1 class="mt-7 text-5xl font-semibold leading-[1.05] tracking-[-0.06em] sm:text-6xl">让个人工具<span class="block bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">更简单、更好用</span></h1><p class="mt-7 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">NOWEN 是一组面向知识管理、数字阅读和内容处理的开源应用。这里提供项目介绍、下载入口、官方文档和完整帮助内容。</p><div class="mt-9 flex flex-wrap gap-3"><a href="/docs" class="nowen-button-primary inline-flex h-11 items-center px-5 text-sm font-semibold">浏览官方文档</a><a href="/projects" class="nowen-button-secondary inline-flex h-11 items-center px-5 text-sm font-semibold">查看所有项目</a><a href="${escapeHtml(current.social.github || 'https://github.com/cropflre')}" class="nowen-button-secondary inline-flex h-11 items-center px-5 text-sm font-semibold">GitHub</a></div></div><aside class="rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-glass-strong)] p-7 shadow-2xl"><p class="font-semibold">NOWEN 产品中心</p><p class="mt-1 text-xs text-[var(--color-text-muted)]">项目、文档与帮助内容统一管理</p><div class="mt-6 grid grid-cols-3 gap-3"><div class="nowen-stat p-4 text-center"><strong class="font-mono text-2xl">${projects.length}</strong><p class="text-xs text-muted">项目</p></div><div class="nowen-stat p-4 text-center"><strong class="font-mono text-2xl">${spaces.length}</strong><p class="text-xs text-muted">文档</p></div><div class="nowen-stat p-4 text-center"><strong class="font-mono text-2xl">${postCount}</strong><p class="text-xs text-muted">文章</p></div></div></aside></div></section>
      <section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><p class="text-sm font-semibold text-[var(--color-primary)]">Documentation</p><h2 class="mt-2 text-3xl font-semibold">从文档开始使用 NOWEN</h2><p class="mt-3 text-[var(--color-text-secondary)]">快速开始、Docker 与 NAS 部署、功能指南、升级说明和故障排查。</p><div class="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">${docs || '<p class="col-span-full rounded-2xl border border-dashed border-[var(--color-border)] p-10 text-center text-muted">文档空间创建后会显示在这里。</p>'}</div></section>
      <section class="border-y border-[var(--color-border)] bg-[var(--color-bg-secondary)]"><div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><p class="text-sm font-semibold text-[var(--color-primary)]">Open source projects</p><h2 class="mt-2 text-3xl font-semibold">持续维护的开源项目</h2><div class="mt-8 grid gap-4 lg:grid-cols-3">${projectCards}</div></div></section>
    </main>
    <footer class="border-t border-line"><div class="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6 lg:px-8"><span>${escapeHtml(current.footerText || current.slogan)}</span><span>© ${new Date().getFullYear()} ${escapeHtml(current.authorName)}</span></div></footer>
  </div>`;
}

function stripSeo(html: string): string {
  return html
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '');
}

async function main(): Promise<void> {
  const distDir = resolve(process.env.DIST_DIR ? resolve(process.env.DIST_DIR) : resolve(process.cwd(), '../web/dist'));
  const templatePath = existsSync(join(distDir, '200.html')) ? join(distDir, '200.html') : join(distDir, 'index.html');
  if (!existsSync(templatePath)) throw new Error(`未找到预渲染模板: ${templatePath}`);
  const template = readFileSync(templatePath, 'utf8');
  const current = settings();
  let projects: Project[] = [];
  try {
    projects = listPublicProjects(100);
  } catch {
    projects = [];
  }
  const posts = await listPublishedForPrerender();
  const description = current.defaultSeoDescription || current.siteDescription;
  const canonical = absoluteUrl('/');
  const head = `<meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:title" content="${escapeHtml(current.defaultSeoTitle || current.siteTitle)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}">`;
  const html = stripSeo(template)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(current.defaultSeoTitle || current.siteTitle)}</title>`)
    .replace('</head>', `${head}</head>`)
    .replace(/<div id="root">[\s\S]*?<\/div>(?=\s*<\/body>)/, `<div id="root">${body(current, docsSpaces(), projects, posts.length)}</div>`);
  writeFileSync(join(distDir, 'index.html'), html);
  console.log('[prerender-portal] 已更新 NOWEN 官方产品门户首页');
}

void main();
