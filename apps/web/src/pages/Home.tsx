import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Code2,
  FileText,
  FolderGit2,
  Github,
  Layers3,
  Mail,
  Search,
  Sparkles,
  Twitter,
} from 'lucide-react';
import { api } from '../lib/api';
import { projectsApi } from '../lib/blog19Api';
import { ArticleCard } from '../components/post/ArticleCard';
import { ProjectCard } from '../components/project/ProjectCard';
import { NewsletterSignup } from '../components/newsletter/NewsletterSignup';
import { Seo } from '../components/seo/Seo';
import { HomeAtmosphere } from '../components/home/HomeAtmosphere';
import { NowenSurface } from '../components/ui/NowenSurface';
import { SectionHeading } from '../components/ui/SectionHeading';
import { HomeCardSkeleton, NowenSkeleton } from '../components/ui/NowenSkeleton';

function ViewAllLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-4 text-sm font-medium"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function SectionError({ message }: { message: string }) {
  return (
    <div className="nowen-surface mt-7 border-dashed p-8 text-center text-sm text-[var(--color-text-secondary)]" role="status">
      {message}
    </div>
  );
}

function HeroMetric({
  icon,
  label,
  value,
  loading,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="nowen-stat min-w-0 p-3.5 text-center">
      <span className="mx-auto flex h-7 w-7 items-center justify-center text-[var(--color-primary)]">{icon}</span>
      {loading ? (
        <NowenSkeleton className="mx-auto mt-2 h-6 w-10" />
      ) : (
        <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-[var(--color-text-primary)]">{value}</p>
      )}
      <p className="mt-1 text-[11px] font-medium text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}

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

  const featuredPosts = (featured.data?.items ?? []).slice(0, 4);
  const latestPosts = latest.data?.items ?? [];
  const title = settings.data?.defaultSeoTitle || settings.data?.siteTitle || 'NOWEN Blog';
  const description = settings.data?.defaultSeoDescription || settings.data?.siteDescription;
  const author = settings.data?.authorName ?? 'NOWEN';

  return (
    <div className="relative isolate overflow-hidden">
      <Seo title={title} description={description} image={settings.data?.defaultOgImage} />
      <HomeAtmosphere />

      <div className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 md:pb-16 md:pt-20 lg:px-8" aria-labelledby="home-hero-title">
          <div className="grid gap-4 lg:grid-cols-6">
            <NowenSurface interactive className="nowen-section-enter p-6 sm:p-8 md:p-10 lg:col-span-4 lg:min-h-[34rem]">
              <div className="flex h-full flex-col">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--color-primary)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_9%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  独立开发 · 技术写作 · 开源实践
                </div>

                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                  Hello, I&apos;m {author}
                </p>
                <h1
                  id="home-hero-title"
                  className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.055em] text-[var(--color-text-primary)] sm:text-5xl md:text-[3.5rem]"
                >
                  把想法，做成
                  <span className="block bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
                    真正可用的产品
                  </span>
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)] md:text-lg">
                  {settings.data?.siteDescription ?? '记录产品设计、前端工程、Node.js、开源项目与长期构建过程。'}
                </p>
                <p className="mt-3 font-editorial text-base italic tracking-wide text-[var(--color-text-muted)]">
                  {settings.data?.slogan ?? 'Write. Build. Share.'}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to="/projects" className="nowen-button-primary nowen-focus inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                    查看项目
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/posts" className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                    阅读文章
                    <BookOpen className="h-4 w-4" />
                  </Link>
                  <Link to="/search" className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-4 py-3 text-sm font-medium">
                    <Search className="h-4 w-4" />
                    搜索内容
                  </Link>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-8">
                  {settings.data?.social.github && (
                    <a href={settings.data.social.github} target="_blank" rel="noreferrer noopener" className="nowen-icon-button nowen-focus inline-flex min-w-11 items-center justify-center gap-2 px-3 text-sm" aria-label="访问 GitHub">
                      <Github className="h-4 w-4" />
                      <span className="hidden sm:inline">GitHub</span>
                    </a>
                  )}
                  {settings.data?.social.twitter && (
                    <a href={settings.data.social.twitter} target="_blank" rel="noreferrer noopener" className="nowen-icon-button nowen-focus inline-flex min-w-11 items-center justify-center gap-2 px-3 text-sm" aria-label="访问 X">
                      <Twitter className="h-4 w-4" />
                      <span className="hidden sm:inline">X</span>
                    </a>
                  )}
                  {settings.data?.social.email && (
                    <a href={`mailto:${settings.data.social.email}`} className="nowen-icon-button nowen-focus inline-flex min-w-11 items-center justify-center gap-2 px-3 text-sm" aria-label="发送邮件">
                      <Mail className="h-4 w-4" />
                      <span className="hidden sm:inline">联系我</span>
                    </a>
                  )}
                </div>
              </div>
            </NowenSurface>

            <NowenSurface interactive className="nowen-section-enter p-6 sm:p-7 lg:col-span-2 lg:min-h-[34rem] [animation-delay:80ms]">
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-4">
                  {settings.data?.logoUrl ? (
                    <img src={settings.data.logoUrl} alt={author} className="h-16 w-16 rounded-2xl border border-[var(--color-glass-border)] object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-2xl font-semibold text-white shadow-[0_12px_30px_var(--color-glow)]">
                      {author.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-[var(--color-text-primary)]">{author}</p>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Builder &amp; Writer</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      持续构建中
                    </div>
                  </div>
                </div>

                <div className="mt-7 grid grid-cols-3 gap-2.5">
                  <HeroMetric icon={<FileText className="h-4 w-4" />} label="文章" value={latest.data?.total ?? 0} loading={latest.isPending} />
                  <HeroMetric icon={<Layers3 className="h-4 w-4" />} label="项目" value={projects.data?.items.length ?? 0} loading={projects.isPending} />
                  <HeroMetric icon={<Code2 className="h-4 w-4" />} label="技术栈" value={projectTopics.length} loading={projects.isPending} />
                </div>

                <div className="mt-7 border-t border-[var(--color-border-light)] pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Current stack</p>
                  {projects.isPending ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[56, 72, 64, 80, 60].map((width) => <NowenSkeleton key={width} className="h-6" style={{ width }} />)}
                    </div>
                  ) : projectTopics.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {projectTopics.map((topic) => <span key={topic} className="nowen-tag truncate px-2.5 py-1" title={topic}>{topic}</span>)}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">技术栈会随着公开项目自动更新。</p>
                  )}
                </div>

                <div className="mt-auto pt-7">
                  <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-tertiary)] p-4">
                    <p className="font-editorial text-sm italic leading-6 text-[var(--color-text-secondary)]">
                      “让界面足够安静，让想法自然抵达。”
                    </p>
                  </div>
                </div>
              </div>
            </NowenSurface>
          </div>
        </section>

        <section className="nowen-section-enter mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8" aria-labelledby="featured-projects-title">
          <SectionHeading
            id="featured-projects-title"
            icon={<FolderGit2 className="h-4 w-4" />}
            eyebrow="Featured projects"
            title="代表项目"
            description="从开源工具到完整产品，关注真实使用价值、持续迭代与长期维护。"
            action={<ViewAllLink to="/projects">全部项目</ViewAllLink>}
          />

          {projects.isPending ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div className="md:col-span-2 lg:col-span-4"><HomeCardSkeleton /></div>
              <div className="lg:col-span-2"><HomeCardSkeleton compact /></div>
              <div className="lg:col-span-2"><HomeCardSkeleton compact /></div>
            </div>
          ) : projects.isError ? (
            <SectionError message="项目暂时无法加载，请稍后刷新。" />
          ) : featuredProjects.length ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              {featuredProjects.map((project, index) => (
                <div key={project.id} className={index === 0 ? 'md:col-span-2 lg:col-span-4 lg:row-span-2' : 'lg:col-span-2'}>
                  <ProjectCard project={project} variant={index === 0 ? 'home-primary' : 'home-compact'} />
                </div>
              ))}
            </div>
          ) : (
            <div className="nowen-surface mt-8 border-dashed p-10 text-center text-sm text-[var(--color-text-muted)]">项目正在整理中。</div>
          )}

          <div className="mt-6 sm:hidden"><ViewAllLink to="/projects">全部项目</ViewAllLink></div>
        </section>

        {(featured.isPending || featured.isError || featuredPosts.length > 0) && (
          <section className="nowen-section-enter mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8" aria-labelledby="selected-writing-title">
            <SectionHeading
              id="selected-writing-title"
              icon={<BookOpen className="h-4 w-4" />}
              eyebrow="Selected writing"
              title="精选文章"
              description="经过时间筛选的技术实践、产品思考与构建记录。"
              action={<ViewAllLink to="/posts">全部文章</ViewAllLink>}
            />

            {featured.isPending ? (
              <div className="mt-8 grid gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3"><HomeCardSkeleton /></div>
                <div className="grid gap-4 lg:col-span-2"><HomeCardSkeleton compact /><HomeCardSkeleton compact /><HomeCardSkeleton compact /></div>
              </div>
            ) : featured.isError ? (
              <SectionError message="精选文章暂时无法加载，请稍后刷新。" />
            ) : (
              <div className="mt-8 grid gap-4 lg:grid-cols-5">
                {featuredPosts[0] && <div className="lg:col-span-3"><ArticleCard post={featuredPosts[0]} variant="home-featured" /></div>}
                <div className="grid gap-4 lg:col-span-2">
                  {featuredPosts.slice(1).map((post) => <ArticleCard key={post.id} post={post} variant="home-compact" />)}
                </div>
              </div>
            )}

            <div className="mt-6 sm:hidden"><ViewAllLink to="/posts">全部文章</ViewAllLink></div>
          </section>
        )}

        <section className="nowen-section-enter mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8" aria-labelledby="latest-content-title">
          <SectionHeading
            id="latest-content-title"
            icon={<FileText className="h-4 w-4" />}
            eyebrow="Latest notes"
            title="最新内容"
            description="最近发布的文章、开发复盘和持续更新中的知识笔记。"
            action={<ViewAllLink to="/posts">进入文章库</ViewAllLink>}
          />

          {latest.isPending ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => <HomeCardSkeleton key={index} />)}
            </div>
          ) : latest.isError ? (
            <SectionError message="最新文章暂时无法加载，请稍后刷新。" />
          ) : latestPosts.length ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post) => <ArticleCard key={post.id} post={post} variant="home-standard" />)}
            </div>
          ) : (
            <div className="nowen-surface mt-8 border-dashed p-10 text-center text-sm text-[var(--color-text-muted)]">内容正在准备中。</div>
          )}

          <div className="mt-6 sm:hidden"><ViewAllLink to="/posts">进入文章库</ViewAllLink></div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 md:pb-28 lg:px-8" aria-label="邮件订阅">
          <NewsletterSignup variant="home" />
        </section>
      </div>
    </div>
  );
}
