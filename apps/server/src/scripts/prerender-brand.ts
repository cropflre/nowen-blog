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

function projectCard(project: Project): string {
  const topics = project.topics
    .slice(0, 5)
    .map((topic) => `<span class="rounded-full border border-line px-2 py-0.5 text-xs text-muted">${escapeHtml(topic)}</span>`)
    .join('');
  const links = [
    project.repositoryUrl
      ? `<a href="${escapeHtml(project.repositoryUrl)}" target="_blank" rel="noreferrer" class="text-sm text-brand">GitHub</a>`
      : '',
    project.homepageUrl
      ? `<a href="${escapeHtml(project.homepageUrl)}" target="_blank" rel="noreferrer" class="text-sm text-brand">访问项目</a>`
      : '',
  ].filter(Boolean).join(' · ');
  return `<article class="rounded-card border border-line bg-surface p-5">
    <div class="flex items-start justify-between gap-3">
      <div><h3 class="text-lg font-semibold">${escapeHtml(project.name)}</h3>${project.githubFullName ? `<p class="mt-1 text-xs text-muted">${escapeHtml(project.githubFullName)}</p>` : ''}</div>
      ${project.isFeatured ? '<span class="rounded-full bg-brand/10 px-2 py-1 text-xs text-brand">精选</span>' : ''}
    </div>
    <p class="mt-3 text-sm leading-6 text-muted">${escapeHtml(project.description || '一个持续打磨中的项目。')}</p>
    ${topics ? `<div class="mt-4 flex flex-wrap gap-2">${topics}</div>` : ''}
    <div class="mt-5 flex items-center justify-between text-xs text-muted"><span>${escapeHtml(project.language)}${project.source === 'github' ? ` · ★ ${project.stars} · Fork ${project.forks}` : ''}</span><span>${links}</span></div>
  </article>`;
}

function postCard(post: ReturnType<typeof toSummary>): string {
  return `<a href="/posts/${encodeURIComponent(post.slug)}" class="block rounded-card border border-line bg-surface p-5 transition hover:border-brand/60">
    <div class="text-xs text-muted">${escapeHtml(post.publishedAt?.slice(0, 10))} · ${post.readingTime} 分钟</div>
    <h3 class="mt-2 text-lg font-semibold">${escapeHtml(post.title)}</h3>
    ${post.summary ? `<p class="mt-2 line-clamp-2 text-sm leading-6 text-muted">${escapeHtml(post.summary)}</p>` : ''}
  </a>`;
}

function shell(settings: SiteSettings, body: string): string {
  return `<div class="flex min-h-screen flex-col">
    <header class="border-b border-line"><div class="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4"><a href="/" class="font-semibold">${escapeHtml(settings.siteTitle)}</a><nav class="flex gap-4 text-sm text-muted"><a href="/posts">文章</a><a href="/projects">项目</a><a href="/about">关于</a></nav></div></header>
    <main class="flex-1">${body}</main>
    <footer class="border-t border-line"><div class="mx-auto max-w-[1120px] px-4 py-10 text-sm text-muted">© ${new Date().getFullYear()} ${escapeHtml(settings.authorName)} · ${escapeHtml(settings.footerText || settings.slogan)}</div></footer>
  </div>`;
}

function homeBody(settings: SiteSettings, projects: Project[], posts: ReturnType<typeof toSummary>[]): string {
  const featuredProjects = (projects.filter((project) => project.isFeatured).length
    ? projects.filter((project) => project.isFeatured)
    : projects).slice(0, 3);
  return shell(settings, `<div>
    <section class="border-b border-line"><div class="mx-auto grid max-w-[1120px] gap-10 px-4 py-20 lg:grid-cols-[1fr_360px] lg:items-center">
      <div><p class="text-sm font-semibold text-brand">INDEPENDENT BUILDER · TECH WRITER</p><h1 class="mt-4 text-4xl font-black leading-tight md:text-6xl">把想法变成真正可用的产品</h1><p class="mt-5 max-w-2xl text-lg leading-8 text-muted">${escapeHtml(settings.siteDescription)}</p><div class="mt-8 flex gap-3"><a href="/projects" class="rounded-lg bg-brand px-5 py-3 text-white">查看项目</a><a href="/posts" class="rounded-lg border border-line px-5 py-3">阅读文章</a></div></div>
      <aside class="rounded-[28px] border border-line bg-surface p-7"><p class="text-sm text-muted">Hello, I&apos;m</p><h2 class="mt-2 text-3xl font-bold">${escapeHtml(settings.authorName)}</h2><p class="mt-3 text-muted">${escapeHtml(settings.slogan)}</p><div class="mt-6 grid grid-cols-2 gap-3"><div class="rounded-xl border border-line p-4 text-center"><strong class="text-2xl">${posts.length}</strong><p class="text-xs text-muted">文章</p></div><div class="rounded-xl border border-line p-4 text-center"><strong class="text-2xl">${projects.length}</strong><p class="text-xs text-muted">项目</p></div></div></aside>
    </div></section>
    <section class="mx-auto max-w-[1120px] px-4 py-14"><div class="flex items-end justify-between"><div><p class="text-sm font-semibold text-brand">FEATURED PROJECTS</p><h2 class="mt-2 text-3xl font-bold">代表项目</h2></div><a href="/projects" class="text-sm text-brand">全部项目</a></div><div class="mt-8 grid gap-6 md:grid-cols-3">${featuredProjects.map(projectCard).join('')}</div></section>
    <section class="border-y border-line bg-surface/40"><div class="mx-auto max-w-[1120px] px-4 py-14"><p class="text-sm font-semibold text-brand">LATEST NOTES</p><h2 class="mt-2 text-3xl font-bold">最新内容</h2><div class="mt-8 grid gap-6 md:grid-cols-3">${posts.slice(0, 6).map(postCard).join('')}</div></div></section>
    <section class="mx-auto max-w-[1120px] px-4 py-14"><div class="rounded-[28px] border border-line bg-surface p-8"><h2 class="text-2xl font-bold">订阅文章更新</h2><p class="mt-2 text-muted">只发送新文章和重要项目更新，可随时退订。</p><div class="mt-5 flex gap-3"><input type="email" placeholder="you@example.com" class="min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 py-3"><button class="rounded-xl bg-brand px-5 py-3 text-white">立即订阅</button></div></div></section>
  </div>`);
}

function projectsBody(settings: SiteSettings, projects: Project[]): string {
  return shell(settings, `<div class="mx-auto max-w-[1120px] px-4 py-14"><p class="text-sm font-semibold text-brand">PROJECTS</p><h1 class="mt-2 text-4xl font-bold">项目与作品</h1><p class="mt-4 text-muted">开源项目、产品实践与持续构建中的作品集。</p><div class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">${projects.map(projectCard).join('')}</div></div>`);
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
  console.log('[prerender] 已更新个人品牌首页和项目页');
}

void main();
