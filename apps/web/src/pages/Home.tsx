import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Box,
  Code2,
  Container,
  FileText,
  Github,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { api } from '../lib/api';
import { helpCenterApi } from '../lib/helpCenterApi';
import { projectsApi } from '../lib/blog19Api';
import { ArticleCard } from '../components/post/ArticleCard';
import { NewsletterSignup } from '../components/newsletter/NewsletterSignup';
import { Seo } from '../components/seo/Seo';

const CAPABILITIES = [
  { icon: Container, title: '自托管优先', description: 'Docker Compose、NAS 与本地环境均可部署，数据由你掌控。' },
  { icon: ShieldCheck, title: '开源透明', description: '公开代码、Issue 与更新记录，持续接受社区反馈。' },
  { icon: LifeBuoy, title: '傻瓜式帮助中心', description: '一个项目一个帮助中心，只保留一级栏目和二级文章。' },
  { icon: Code2, title: '持续迭代', description: '围绕笔记、阅读和内容处理持续构建可用产品。' },
];

export function Home() {
  const settings = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });
  const helpCenters = useQuery({ queryKey: ['help-centers', 'home'], queryFn: helpCenterApi.list });
  const projects = useQuery({ queryKey: ['projects', 'home'], queryFn: () => projectsApi.listPublic(6) });
  const posts = useQuery({
    queryKey: ['posts', 'home-latest'],
    queryFn: () => api.listPosts({ pageSize: 6 }),
  });

  const featuredProjects = useMemo(() => {
    const items = projects.data?.items ?? [];
    const featured = items.filter((item) => item.isFeatured);
    return (featured.length ? featured : items).slice(0, 3);
  }, [projects.data?.items]);

  const title = settings.data?.defaultSeoTitle || settings.data?.siteTitle || 'NOWEN';
  const description =
    settings.data?.defaultSeoDescription ||
    settings.data?.siteDescription ||
    'NOWEN 开源项目、官方帮助中心与技术博客。';

  return (
    <div className="overflow-hidden bg-[var(--color-bg-primary)]">
      <Seo title={title} description={description} image={settings.data?.defaultOgImage} />

      <section className="relative isolate border-b border-[var(--color-border)]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_srgb,var(--color-primary)_18%,transparent),transparent_36%),radial-gradient(circle_at_85%_20%,color-mix(in_srgb,var(--color-accent)_12%,transparent),transparent_32%)]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:items-center lg:px-8 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--color-primary)_26%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_9%,transparent)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary)]">
              <Sparkles className="h-4 w-4" /> 开源产品 · 官方帮助中心 · 持续维护
            </div>
            <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-[-0.06em] text-[var(--color-text-primary)] sm:text-6xl lg:text-7xl">
              让个人工具
              <span className="block bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
                更简单、更好用
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">
              NOWEN 是一组面向知识管理、数字阅读和内容处理的开源应用。每个项目都有独立帮助中心，安装、部署和使用方法一眼就能找到。
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/docs" className="nowen-button-primary nowen-focus inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                打开帮助中心 <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/projects" className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                查看所有项目 <Box className="h-4 w-4" />
              </Link>
              <a
                href={settings.data?.social.github || 'https://github.com/cropflre'}
                target="_blank"
                rel="noreferrer noopener"
                className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold"
              >
                GitHub <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] blur-3xl" />
            <div className="rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-glass-strong)] p-5 shadow-2xl backdrop-blur-2xl sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">NOWEN 产品中心</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">一个项目对应一个帮助中心</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]"><BookOpen className="h-5 w-5" /></span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-bg-tertiary)] p-4 text-center"><p className="font-mono text-2xl font-semibold text-[var(--color-text-primary)]">{projects.data?.items.length ?? 0}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">开源项目</p></div>
                <div className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-bg-tertiary)] p-4 text-center"><p className="font-mono text-2xl font-semibold text-[var(--color-text-primary)]">{helpCenters.data?.items.length ?? 0}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">帮助中心</p></div>
                <div className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-bg-tertiary)] p-4 text-center"><p className="font-mono text-2xl font-semibold text-[var(--color-text-primary)]">{posts.data?.total ?? 0}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">技术文章</p></div>
              </div>
              <div className="mt-5 space-y-3">
                {(helpCenters.data?.items ?? []).slice(0, 3).map((center) => (
                  <Link key={center.id} to={`/docs/${center.slug}`} className="group flex items-center gap-4 rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-bg-secondary)] p-4 transition hover:border-[color-mix(in_srgb,var(--color-primary)_36%,var(--color-border))]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]"><BookOpen className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate font-medium text-[var(--color-text-primary)]">{center.name} 帮助中心</p><p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{center.documentCount} 篇公开文档</p></div>
                    <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--color-primary)]" />
                  </Link>
                ))}
                {!helpCenters.isPending && !helpCenters.data?.items.length && <p className="rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">帮助中心创建后会显示在这里。</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="home-docs-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold text-[var(--color-primary)]">Help centers</p><h2 id="home-docs-title" className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">选择项目，直接解决问题</h2><p className="mt-3 max-w-2xl text-[var(--color-text-secondary)]">没有版本、空间和复杂层级。每个项目只有一个帮助中心，目录最多两级。</p></div>
          <Link to="/docs" className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-4 py-2.5 text-sm">全部帮助中心 <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(helpCenters.data?.items ?? []).slice(0, 6).map((center) => (
            <Link key={center.id} to={`/docs/${center.slug}`} className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-6 transition hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--color-primary)_42%,var(--color-border))] hover:shadow-xl">
              <div className="flex items-center justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]"><BookOpen className="h-5 w-5" /></span><span className="text-xs text-[var(--color-text-muted)]">{center.documentCount} 篇</span></div>
              <h3 className="mt-5 text-xl font-semibold text-[var(--color-text-primary)]">{center.name} 帮助中心</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">{center.description || '查看项目的安装、配置与使用说明。'}</p>
              <p className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]">查看帮助 <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return <div key={item.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-5"><Icon className="h-5 w-5 text-[var(--color-primary)]" /><h3 className="mt-4 font-semibold text-[var(--color-text-primary)]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{item.description}</p></div>;
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="home-projects-title">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--color-primary)]">Open source projects</p><h2 id="home-projects-title" className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">持续维护的开源项目</h2></div><Link to="/projects" className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-4 py-2.5 text-sm">全部项目 <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {featuredProjects.map((project) => (
            <article key={project.id} className="flex min-h-64 flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-6">
              <div className="flex items-start justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-bg-tertiary)] text-[var(--color-primary)]"><Box className="h-5 w-5" /></span>{project.stars > 0 && <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)]"><Star className="h-3.5 w-3.5" />{project.stars}</span>}</div>
              <h3 className="mt-5 text-xl font-semibold text-[var(--color-text-primary)]">{project.name}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">{project.description || 'NOWEN 开源项目'}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-6">{project.language && <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">{project.language}</span>}{project.topics.slice(0, 2).map((topic) => <span key={topic} className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">{topic}</span>)}</div>
              <div className="mt-5 flex gap-3">{project.homepageUrl && <a href={project.homepageUrl} target="_blank" rel="noreferrer noopener" className="text-sm font-medium text-[var(--color-primary)]">访问项目</a>}{project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)]"><Github className="h-4 w-4" />源码</a>}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--color-primary)]">Blog & changelog</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">开发日志与技术文章</h2></div><Link to="/blog" className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-4 py-2.5 text-sm">阅读博客 <FileText className="h-4 w-4" /></Link></div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{(posts.data?.items ?? []).slice(0, 6).map((post) => <ArticleCard key={post.id} post={post} />)}</div>
          <div className="mt-14 rounded-3xl border border-[var(--color-border)] bg-[var(--color-glass-strong)] p-6 sm:p-8"><NewsletterSignup /></div>
        </div>
      </section>
    </div>
  );
}
