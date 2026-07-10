import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import type { Project, SiteSettings } from '@blog/shared';
import { siteSettings as defaultSettings } from '../config/site';
import { absoluteUrl } from '../lib/seo';
import { toSummary } from '../lib/mapping';
import { listPublishedForPrerender } from '../modules/posts/posts.repository';
import { listPublicProjects } from '../modules/projects/projects.service';
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

function tag(value: string): string {
  return `<span class="nowen-tag truncate px-2 py-1" title="${escapeHtml(value)}">${escapeHtml(value)}</span>`;
}

function projectCard(project: Project, variant: 'primary' | 'compact' | 'standard' = 'standard'): string {
  const primary = variant === 'primary';
  const compact = variant === 'compact';
  const topics = project.topics.slice(0, primary ? 6 : compact ? 3 : 5).map(tag).join('');
  const media = !compact
    ? project.coverUrl
      ? `<div class="aspect-[16/8] overflow-hidden border-b border-[var(--color-border-light)]"><img src="${escapeHtml(project.coverUrl)}" alt="${escapeHtml(project.name)}" class="h-full w-full object-cover"></div>`
      : `<div class="relative aspect-[16/8] overflow-hidden border-b border-[var(--color-border-light)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-primary)_20%,var(--color-bg-tertiary)),color-mix(in_srgb,var(--color-accent)_12%,var(--color-bg-primary)))]"><strong class="absolute bottom-5 left-6 font-mono text-3xl">${escapeHtml(project.name.slice(0, 2).toUpperCase())}</strong></div>`
    : '';
  const links = [
    project.repositoryUrl
      ? `<a href="${escapeHtml(project.repositoryUrl)}" target="_blank" rel="noreferrer noopener" class="nowen-icon-button nowen-focus inline-flex h-11 items-center px-3">GitHub</a>`
      : '',
    project.homepageUrl
      ? `<a href="${escapeHtml(project.homepageUrl)}" target="_blank" rel="noreferrer noopener" class="nowen-icon-button nowen-focus inline-flex h-11 items-center px-3">访问</a>`
      : '',
  ].filter(Boolean).join('');

  return `<article class="nowen-card flex h-full ${primary ? 'min-h-[28rem]' : compact ? 'min-h-[13.5rem]' : ''} flex-col">
    ${media}
    <div class="flex flex-1 flex-col ${primary ? 'p-6' : 'p-5'}">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0"><h3 class="truncate ${primary ? 'text-2xl' : 'text-lg'} font-semibold tracking-tight">${escapeHtml(project.name)}</h3>${project.githubFullName ? `<p class="mt-1 truncate font-mono text-[11px] text-[var(--color-text-muted)]">${escapeHtml(project.githubFullName)}</p>` : ''}</div>
        ${project.isFeatured ? '<span class="nowen-tag shrink-0 px-2 py-1 text-[var(--color-primary)]">精选</span>' : ''}
      </div>
      <p class="mt-3 ${compact ? 'line-clamp-2' : 'line-clamp-3'} text-sm leading-6 text-[var(--color-text-secondary)]">${escapeHtml(project.description || '一个持续打磨中的项目。')}</p>
      ${topics ? `<div class="mt-4 flex flex-wrap gap-1.5">${topics}</div>` : ''}
      <div class="mt-auto flex items-center justify-between gap-3 pt-5 text-xs text-[var(--color-text-muted)]"><span class="font-mono">${escapeHtml(project.language)}${project.source === 'github' ? ` · ★ ${project.stars} · Fork ${project.forks}` : ''}</span><span class="flex gap-2">${links}</span></div>
    </div>
  </article>`;
}

function postCard(post: ReturnType<typeof toSummary>, variant: 'featured' | 'compact' | 'standard' = 'standard'): string {
  const compact = variant === 'compact';
  const featured = variant === 'featured';
  const categories = post.categories.slice(0, compact ? 2 : 3).map((category) => tag(category.name)).join('');
  const cover = post.coverUrl && !compact
    ? `<div class="${featured ? 'aspect-[16/8]' : 'aspect-[16/9]'} overflow-hidden"><img src="${escapeHtml(post.coverUrl)}" alt="${escapeHtml(post.title)}" class="h-full w-full object-cover"></div>`
    : '';

  return `<a href="/posts/${encodeURIComponent(post.slug)}" class="nowen-card nowen-focus flex h-full ${featured ? 'min-h-[26rem]' : compact ? 'min-h-36 p-5' : 'min-h-[22rem]'} flex-col">
    ${cover}
    <div class="flex flex-1 flex-col ${compact ? '' : 'p-6'}">
      <div class="mb-3 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">${categories}${compact ? `<span class="ml-auto font-mono">${escapeHtml(post.publishedAt?.slice(0, 10))}</span>` : ''}</div>
      <h3 class="${featured ? 'text-2xl leading-8' : compact ? 'line-clamp-2 text-base leading-6' : 'text-lg'} font-semibold tracking-tight">${escapeHtml(post.title)}</h3>
      ${!compact && post.summary ? `<p class="mt-3 ${featured ? 'line-clamp-3' : 'line-clamp-2'} text-sm leading-6 text-[var(--color-text-secondary)]">${escapeHtml(post.summary)}</p>` : ''}
      <div class="mt-auto flex items-center gap-3 pt-5 text-xs text-[var(--color-text-muted)]">${compact ? '' : `<span class="font-mono">${escapeHtml(post.publishedAt?.slice(0, 10))}</span>`}<span>${post.readingTime} 分钟</span><span class="font-mono">${post.viewCount} 阅读</span></div>
    </div>
  </a>`;
}

function shell(settings: SiteSettings, body: string): string {
  return `<div class="flex min-h-screen flex-col" style="--color-primary:${escapeHtml(settings.themeColor)};--brand:${escapeHtml(settings.themeColor)}">
    <header class="border-b border-line bg-bg/80 backdrop-blur"><div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8"><a href="/" class="font-semibold">${escapeHtml(settings.siteTitle)}</a><nav class="flex gap-4 text-sm text-muted"><a href="/posts">文章</a><a href="/projects">项目</a><a href="/about">关于</a></nav></div></header>
    <main class="flex-1">${body}</main>
    <footer class="border-t border-line"><div class="mx-auto max-w-6xl px-4 py-10 text-sm text-muted sm:px-6 lg:px-8">© ${new Date().getFullYear()} ${escapeHtml(settings.authorName)} · ${escapeHtml(settings.footerText || settings.slogan)}</div></footer>
  </div>`;
}

function homeBody(settings: SiteSettings, projects: Project[], posts: ReturnType<typeof toSummary>[]): string {
  const featuredProjects = (projects.filter((project) => project.isFeatured).length
    ? projects.filter((project) => project.isFeatured)
    : projects).slice(0, 3);
  const featuredPosts = posts.filter((post) => post.isFeatured).slice(0, 4);
  const latestPosts = posts.slice(0, 6);
  const topics = Array.from(new Set(projects.flatMap((project) => [project.language, ...project.topics].filter(Boolean) as string[]))).slice(0, 8);
  const social = [
    settings.social.github ? `<a href="${escapeHtml(settings.social.github)}" class="nowen-icon-button inline-flex h-11 items-center px-3">GitHub</a>` : '',
    settings.social.twitter ? `<a href="${escapeHtml(settings.social.twitter)}" class="nowen-icon-button inline-flex h-11 items-center px-3">X</a>` : '',
    settings.social.email ? `<a href="mailto:${escapeHtml(settings.social.email)}" class="nowen-icon-button inline-flex h-11 items-center px-3">联系我</a>` : '',
  ].filter(Boolean).join('');
  const projectGrid = featuredProjects.map((project, index) => `<div class="${index === 0 ? 'md:col-span-2 lg:col-span-4 lg:row-span-2' : 'lg:col-span-2'}">${projectCard(project, index === 0 ? 'primary' : 'compact')}</div>`).join('');
  const selectedWriting = featuredPosts.length
    ? `<section class="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8"><p class="nowen-eyebrow">Selected writing</p><h2 class="mt-3 text-3xl font-semibold tracking-tight">精选文章</h2><p class="mt-2 text-[var(--color-text-secondary)]">经过时间筛选的技术实践、产品思考与构建记录。</p><div class="mt-8 grid gap-4 lg:grid-cols-5"><div class="lg:col-span-3">${postCard(featuredPosts[0], 'featured')}</div><div class="grid gap-4 lg:col-span-2">${featuredPosts.slice(1).map((post) => postCard(post, 'compact')).join('')}</div></div></section>`
    : '';

  return shell(settings, `<div class="relative isolate overflow-hidden">
    <div class="nowen-atmosphere" aria-hidden="true"></div>
    <div class="relative z-10">
      <section class="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 md:pb-16 md:pt-20 lg:px-8"><div class="grid gap-4 lg:grid-cols-6">
        <div class="nowen-surface p-6 sm:p-8 md:p-10 lg:col-span-4 lg:min-h-[34rem]"><div class="flex h-full flex-col"><span class="w-fit rounded-full border border-[var(--color-glass-border)] bg-[var(--color-glass)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)]">独立开发 · 技术写作 · 开源实践</span><p class="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Hello, I&apos;m ${escapeHtml(settings.authorName)}</p><h1 class="mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-5xl md:text-[3.5rem]">把想法，做成<span class="block bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">真正可用的产品</span></h1><p class="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">${escapeHtml(settings.siteDescription)}</p><p class="mt-3 font-editorial italic text-[var(--color-text-muted)]">${escapeHtml(settings.slogan)}</p><div class="mt-8 flex flex-wrap gap-3"><a href="/projects" class="nowen-button-primary inline-flex h-11 items-center px-5 text-sm font-semibold">查看项目</a><a href="/posts" class="nowen-button-secondary inline-flex h-11 items-center px-5 text-sm font-semibold">阅读文章</a><a href="/search" class="nowen-button-secondary inline-flex h-11 items-center px-4 text-sm">搜索内容</a></div><div class="mt-auto flex flex-wrap gap-2 pt-8">${social}</div></div></div>
        <aside class="nowen-surface p-6 sm:p-7 lg:col-span-2 lg:min-h-[34rem]"><div class="flex h-full flex-col"><div class="flex items-center gap-4">${settings.logoUrl ? `<img src="${escapeHtml(settings.logoUrl)}" alt="${escapeHtml(settings.authorName)}" class="h-16 w-16 rounded-2xl object-cover">` : `<span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-2xl font-semibold text-white">${escapeHtml(settings.authorName.slice(0, 1).toUpperCase())}</span>`}<div><p class="text-lg font-semibold">${escapeHtml(settings.authorName)}</p><p class="mt-1 text-sm text-[var(--color-text-secondary)]">Builder &amp; Writer</p><p class="mt-2 text-xs text-emerald-500">● 持续构建中</p></div></div><div class="mt-7 grid grid-cols-3 gap-2.5"><div class="nowen-stat p-3.5 text-center"><strong class="font-mono text-xl">${posts.length}</strong><p class="text-[11px] text-[var(--color-text-muted)]">文章</p></div><div class="nowen-stat p-3.5 text-center"><strong class="font-mono text-xl">${projects.length}</strong><p class="text-[11px] text-[var(--color-text-muted)]">项目</p></div><div class="nowen-stat p-3.5 text-center"><strong class="font-mono text-xl">${topics.length}</strong><p class="text-[11px] text-[var(--color-text-muted)]">技术栈</p></div></div>${topics.length ? `<div class="mt-7 border-t border-[var(--color-border-light)] pt-6"><p class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Current stack</p><div class="mt-4 flex flex-wrap gap-2">${topics.map(tag).join('')}</div></div>` : ''}<div class="mt-auto pt-7"><div class="rounded-xl bg-[var(--color-bg-tertiary)] p-4 font-editorial text-sm italic text-[var(--color-text-secondary)]">“让界面足够安静，让想法自然抵达。”</div></div></div></aside>
      </div></section>
      <section class="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8"><p class="nowen-eyebrow">Featured projects</p><h2 class="mt-3 text-3xl font-semibold tracking-tight">代表项目</h2><p class="mt-2 text-[var(--color-text-secondary)]">从开源工具到完整产品，关注真实使用价值、持续迭代与长期维护。</p><div class="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-6">${projectGrid || '<div class="nowen-surface border-dashed p-10 text-center text-[var(--color-text-muted)] md:col-span-2 lg:col-span-6">项目正在整理中。</div>'}</div></section>
      ${selectedWriting}
      <section class="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8"><p class="nowen-eyebrow">Latest notes</p><h2 class="mt-3 text-3xl font-semibold tracking-tight">最新内容</h2><p class="mt-2 text-[var(--color-text-secondary)]">最近发布的文章、开发复盘和持续更新中的知识笔记。</p><div class="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">${latestPosts.map((post) => postCard(post)).join('')}</div></section>
      <section class="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 md:pb-28 lg:px-8"><div class="nowen-surface grid items-center gap-7 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] md:p-10"><div><p class="nowen-eyebrow">Quiet updates</p><h2 class="mt-2 text-2xl font-semibold">订阅文章更新</h2><p class="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">只发送新文章和重要项目更新，不发送营销垃圾邮件，可随时退订。</p></div><div class="flex gap-3"><input type="email" aria-label="邮箱地址" placeholder="you@example.com" class="min-w-0 flex-1 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-bg-tertiary)] px-4 py-3"><button class="nowen-button-primary px-5 py-3 text-sm font-semibold">立即订阅</button></div></div></section>
    </div>
  </div>`);
}

function projectsBody(settings: SiteSettings, projects: Project[]): string {
  return shell(settings, `<div class="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8"><p class="nowen-eyebrow">Projects</p><h1 class="mt-3 text-4xl font-semibold tracking-tight">项目与作品</h1><p class="mt-4 text-[var(--color-text-secondary)]">开源项目、产品实践与持续构建中的作品集。</p><div class="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">${projects.map((project) => projectCard(project)).join('')}</div></div>`);
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
  const rows = await listPublishedForPrerender();
  const posts = rows.map(toSummary);
  let projects: Project[] = [];
  try {
    projects = listPublicProjects(100);
  } catch {
    projects = [];
  }

  safeWrite(
    distDir,
    'index.html',
    buildPage(template, settings.defaultSeoTitle || settings.siteTitle, settings.defaultSeoDescription || settings.siteDescription, '/', homeBody(settings, projects, posts)),
  );
  safeWrite(
    distDir,
    'projects/index.html',
    buildPage(template, `项目 - ${settings.siteTitle}`, '开源项目、产品实践与持续构建中的作品集。', '/projects', projectsBody(settings, projects)),
  );
  console.log('[prerender] 已更新 NOWEN 个人品牌首页和项目页');
}

void main();
