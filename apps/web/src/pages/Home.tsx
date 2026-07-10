import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, FolderGit2, Github, Mail, Sparkles, Twitter } from 'lucide-react';
import { api } from '../lib/api';
import { projectsApi } from '../lib/blog19Api';
import { ArticleCard } from '../components/post/ArticleCard';
import { ProjectCard } from '../components/project/ProjectCard';
import { NewsletterSignup } from '../components/newsletter/NewsletterSignup';
import { Seo } from '../components/seo/Seo';

export function Home() {
  const settings = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });
  const featured = useQuery({ queryKey: ['featured'], queryFn: api.listFeatured });
  const latest = useQuery({
    queryKey: ['posts', 'latest'],
    queryFn: () => api.listPosts({ pageSize: 6 }),
  });
  const projects = useQuery({ queryKey: ['projects', 'home'], queryFn: () => projectsApi.listPublic(6) });

  const featuredProjects = useMemo(() => {
    const items = projects.data?.items ?? [];
    const selected = items.filter((project) => project.isFeatured);
    return (selected.length ? selected : items).slice(0, 3);
  }, [projects.data?.items]);

  const projectTopics = useMemo(() => {
    const values = new Set<string>();
    for (const project of projects.data?.items ?? []) {
      if (project.language) values.add(project.language);
      for (const topic of project.topics) values.add(topic);
    }
    return Array.from(values).slice(0, 8);
  }, [projects.data?.items]);

  const title = settings.data?.defaultSeoTitle || settings.data?.siteTitle || 'NOWEN Blog';
  const description = settings.data?.defaultSeoDescription || settings.data?.siteDescription;
  const author = settings.data?.authorName ?? 'NOWEN';

  return (
    <div>
      <Seo title={title} description={description} image={settings.data?.defaultOgImage} />

      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,.16),transparent_34%),radial-gradient(circle_at_80%_35%,rgba(168,85,247,.12),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-[1120px] gap-12 px-4 py-20 md:py-28 lg:grid-cols-[minmax(0,1.25fr)_380px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand">
              <Sparkles className="h-3.5 w-3.5" />独立开发 · 技术写作 · 开源实践
            </div>
            <p className="mt-7 text-sm font-medium uppercase tracking-[0.22em] text-muted">Hello, I&apos;m {author}</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight md:text-6xl lg:text-7xl">
              把想法变成
              <span className="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-transparent">真正可用的产品</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted md:text-lg">
              {settings.data?.siteDescription ?? '记录产品设计、前端工程、Node.js、开源项目与长期构建过程。'}
            </p>
            <p className="mt-3 text-sm text-muted">{settings.data?.slogan ?? 'Write. Build. Share.'}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/projects" className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                查看项目<ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/posts" className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold transition hover:border-brand/60 hover:text-brand">
                阅读文章<BookOpen className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              {settings.data?.social.github && (
                <a href={settings.data.social.github} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:border-brand/50 hover:text-fg"><Github className="h-4 w-4" />GitHub</a>
              )}
              {settings.data?.social.twitter && (
                <a href={settings.data.social.twitter} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:border-brand/50 hover:text-fg"><Twitter className="h-4 w-4" />X</a>
              )}
              {settings.data?.social.email && (
                <a href={`mailto:${settings.data.social.email}`} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:border-brand/50 hover:text-fg"><Mail className="h-4 w-4" />联系我</a>
              )}
            </div>
          </div>

          <aside className="relative rounded-[32px] border border-line bg-surface/90 p-6 shadow-2xl shadow-brand/10 backdrop-blur md:p-8">
            <div className="flex items-center gap-4">
              {settings.data?.logoUrl ? (
                <img src={settings.data.logoUrl} alt={author} className="h-16 w-16 rounded-2xl border border-line object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-2 text-2xl font-black text-white">{author.slice(0, 1).toUpperCase()}</div>
              )}
              <div>
                <p className="text-lg font-bold">{author}</p>
                <p className="mt-1 text-sm text-muted">Builder & Writer</p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-line bg-bg/50 p-3 text-center"><p className="text-xl font-bold">{latest.data?.total ?? 0}</p><p className="mt-1 text-[11px] text-muted">文章</p></div>
              <div className="rounded-xl border border-line bg-bg/50 p-3 text-center"><p className="text-xl font-bold">{projects.data?.items.length ?? 0}</p><p className="mt-1 text-[11px] text-muted">项目</p></div>
              <div className="rounded-xl border border-line bg-bg/50 p-3 text-center"><p className="text-xl font-bold">{projectTopics.length}</p><p className="mt-1 text-[11px] text-muted">技术栈</p></div>
            </div>

            {projectTopics.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {projectTopics.map((topic) => <span key={topic} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">{topic}</span>)}
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-4 py-14 md:py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-brand"><FolderGit2 className="h-4 w-4" />FEATURED PROJECTS</div>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">代表项目</h2>
            <p className="mt-2 text-sm leading-6 text-muted">从开源工具到完整产品，关注真实使用价值与长期维护。</p>
          </div>
          <Link to="/projects" className="hidden items-center gap-1 text-sm font-medium text-muted transition hover:text-brand sm:inline-flex">全部项目<ArrowRight className="h-4 w-4" /></Link>
        </div>
        {featuredProjects.length ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredProjects.map((project) => <ProjectCard key={project.id} project={project} compact />)}
          </div>
        ) : (
          <div className="mt-8 rounded-card border border-dashed border-line p-10 text-center text-muted">项目正在整理中。</div>
        )}
      </section>

      {(featured.data?.items.length ?? 0) > 0 && (
        <section className="border-y border-line bg-surface/40">
          <div className="mx-auto max-w-[1120px] px-4 py-14 md:py-20">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-sm font-semibold text-brand">SELECTED WRITING</p><h2 className="mt-2 text-2xl font-bold md:text-3xl">精选文章</h2></div>
              <Link to="/posts" className="hidden items-center gap-1 text-sm font-medium text-muted transition hover:text-brand sm:inline-flex">全部文章<ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {(featured.data?.items ?? []).slice(0, 4).map((post) => <ArticleCard key={post.id} post={post} featured />)}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1120px] px-4 py-14 md:py-20">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-sm font-semibold text-brand">LATEST NOTES</p><h2 className="mt-2 text-2xl font-bold md:text-3xl">最新内容</h2></div>
          <Link to="/posts" className="hidden items-center gap-1 text-sm font-medium text-muted transition hover:text-brand sm:inline-flex">进入文章库<ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(latest.data?.items ?? []).map((post) => <ArticleCard key={post.id} post={post} />)}
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-4 pb-16 md:pb-24">
        <NewsletterSignup />
      </section>
    </div>
  );
}
