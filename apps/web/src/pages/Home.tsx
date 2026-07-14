import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Container,
  FileText,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { api } from '../lib/api';
import { helpCenterApi } from '../lib/helpCenterApi';
import { ArticleCard } from '../components/post/ArticleCard';
import { NewsletterSignup } from '../components/newsletter/NewsletterSignup';
import { Seo } from '../components/seo/Seo';

const CAPABILITIES = [
  { icon: Container, title: '自托管优先', description: 'Docker Compose、NAS 与本地环境均可部署，数据由你掌控。' },
  { icon: ShieldCheck, title: '手动可控', description: '项目和文档全部由后台维护，不依赖外部账号或同步服务。' },
  { icon: LifeBuoy, title: '傻瓜式帮助中心', description: '一个项目一个帮助中心，只保留一级栏目和二级文章。' },
  { icon: WandSparkles, title: 'AI 自动写文档', description: '描述项目后生成目录和草稿，审核确认后再应用和发布。' },
];

export function Home() {
  const settings = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });
  const helpCenters = useQuery({ queryKey: ['help-centers', 'home'], queryFn: helpCenterApi.list });
  const posts = useQuery({
    queryKey: ['posts', 'home-latest'],
    queryFn: () => api.listPosts({ pageSize: 6 }),
  });

  const featuredCenters = useMemo(() => (helpCenters.data?.items ?? []).slice(0, 6), [helpCenters.data?.items]);
  const documentTotal = useMemo(
    () => (helpCenters.data?.items ?? []).reduce((total, center) => total + center.documentCount, 0),
    [helpCenters.data?.items],
  );

  const title = settings.data?.defaultSeoTitle || settings.data?.siteTitle || 'NOWEN';
  const description =
    settings.data?.defaultSeoDescription ||
    settings.data?.siteDescription ||
    'NOWEN 项目帮助中心与技术博客。';

  return (
    <div className="overflow-hidden bg-[var(--color-bg-primary)]">
      <Seo title={title} description={description} image={settings.data?.defaultOgImage} />

      <section className="relative isolate border-b border-[var(--color-border)]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_srgb,var(--color-primary)_18%,transparent),transparent_36%),radial-gradient(circle_at_85%_20%,color-mix(in_srgb,var(--color-accent)_12%,transparent),transparent_32%)]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:items-center lg:px-8 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--color-primary)_26%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_9%,transparent)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary)]">
              <Sparkles className="h-4 w-4" /> 产品中心 · 官方帮助 · AI 文档
            </div>
            <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-[-0.06em] text-[var(--color-text-primary)] sm:text-6xl lg:text-7xl">
              找到项目
              <span className="block bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
                直接解决问题
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">
              每个项目只有一个帮助中心。安装、部署、功能使用和常见问题都由后台手动维护，并可使用 AI 生成待审核草稿。
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/docs" className="nowen-button-primary nowen-focus inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                打开帮助中心 <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/projects" className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                查看所有项目 <BookOpen className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] blur-3xl" />
            <div className="rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-glass-strong)] p-5 shadow-2xl backdrop-blur-2xl sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-sm font-semibold text-[var(--color-text-primary)]">NOWEN 产品中心</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">一个项目对应一个帮助中心</p></div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]"><BookOpen className="h-5 w-5" /></span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-bg-tertiary)] p-4 text-center"><p className="font-mono text-2xl font-semibold text-[var(--color-text-primary)]">{helpCenters.data?.items.length ?? 0}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">项目</p></div>
                <div className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-bg-tertiary)] p-4 text-center"><p className="font-mono text-2xl font-semibold text-[var(--color-text-primary)]">{documentTotal}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">帮助文档</p></div>
                <div className="rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-bg-tertiary)] p-4 text-center"><p className="font-mono text-2xl font-semibold text-[var(--color-text-primary)]">{posts.data?.total ?? 0}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">技术文章</p></div>
              </div>
              <div className="mt-5 space-y-3">
                {featuredCenters.slice(0, 3).map((center) => (
                  <Link key={center.id} to={`/docs/${center.slug}`} className="group flex items-center gap-4 rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-bg-secondary)] p-4 transition hover:border-[color-mix(in_srgb,var(--color-primary)_36%,var(--color-border))]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]"><BookOpen className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate font-medium text-[var(--color-text-primary)]">{center.name} 帮助中心</p><p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{center.documentCount} 篇公开文档</p></div>
                    <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--color-primary)]" />
                  </Link>
                ))}
                {!helpCenters.isPending && !featuredCenters.length && <p className="rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">后台创建项目后会显示在这里。</p>}
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
          {featuredCenters.map((center) => (
            <Link key={center.id} to={`/docs/${center.slug}`} className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-6 transition hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--color-primary)_42%,var(--color-border))] hover:shadow-xl">
              <div className="flex items-center justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]"><BookOpen className="h-5 w-5" /></span><span className="text-xs text-[var(--color-text-muted)]">{center.documentCount} 篇</span></div>
              <h3 className="mt-5 text-xl font-semibold text-[var(--color-text-primary)]">{center.name}</h3>
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
