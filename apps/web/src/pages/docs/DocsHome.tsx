import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Box,
  CircleHelp,
  Container,
  FileQuestion,
  Github,
  Search,
  Server,
  Wrench,
} from 'lucide-react';
import { docsApi } from '../../lib/docsApi';
import { Seo } from '../../components/seo/Seo';

const HELP_TOPICS = [
  { icon: Container, title: 'Docker 部署', description: '使用 Docker Compose 快速部署 NOWEN 项目。', query: 'Docker 部署' },
  { icon: Server, title: 'NAS 使用', description: '群晖、绿联及其他 NAS 的部署与访问说明。', query: 'NAS 部署' },
  { icon: Wrench, title: '故障排查', description: '白屏、图片加载、数据库与升级问题处理。', query: '故障排查' },
  { icon: FileQuestion, title: '常见问题', description: '整理用户最常遇到的安装与使用问题。', query: '常见问题' },
];

export function DocsHome() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const spaces = useQuery({ queryKey: ['docs', 'spaces'], queryFn: docsApi.listSpaces });
  const results = useQuery({
    queryKey: ['docs', 'search', deferredSearch],
    queryFn: () => docsApi.search(deferredSearch),
    enabled: deferredSearch.length >= 2,
  });

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <Seo
        title="官方文档"
        description="NOWEN 项目的安装、部署、使用指南、功能说明与故障排查文档。"
      />

      <section className="border-b border-[var(--color-border)] bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--color-primary)_16%,transparent),transparent_54%)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
              <BookOpen className="h-7 w-7" />
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">
              NOWEN Documentation
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-[var(--color-text-primary)] sm:text-5xl">
              官方文档与帮助中心
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)] md:text-lg">
              查找 NOWEN 开源项目的快速开始、Docker 与 NAS 部署、功能说明、升级指南和故障排查。
            </p>

            <div className="relative mx-auto mt-9 max-w-2xl text-left">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索文档，例如：Docker 部署、OPDS、图片加载……"
                className="nowen-focus min-h-14 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass-strong)] pl-12 pr-4 text-base text-[var(--color-text-primary)] shadow-lg backdrop-blur-xl placeholder:text-[var(--color-text-muted)]"
              />
              {deferredSearch.length >= 2 && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 max-h-[28rem] overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass-strong)] p-2 shadow-2xl backdrop-blur-2xl">
                  {results.isPending ? (
                    <p className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">正在搜索文档…</p>
                  ) : results.data?.items.length ? (
                    results.data.items.map((item) => (
                      <Link
                        key={item.id}
                        to={`/docs/${item.spaceSlug}/${item.version}/${item.path}`}
                        className="block rounded-xl px-4 py-3 transition hover:bg-[var(--color-glass-hover)]"
                        onClick={() => setSearch('')}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-medium text-[var(--color-text-primary)]">{item.title}</p>
                          <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{item.versionLabel}</span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--color-primary)]">{item.spaceName} / {item.path}</p>
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">{item.description}</p>
                        )}
                      </Link>
                    ))
                  ) : (
                    <p className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">没有找到相关文档。</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8" aria-labelledby="docs-products-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-primary)]">Products</p>
            <h2 id="docs-products-title" className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text-primary)]">
              选择项目文档
            </h2>
            <p className="mt-2 text-[var(--color-text-secondary)]">每个项目拥有独立目录、版本与帮助内容。</p>
          </div>
          <a
            href="https://github.com/cropflre"
            target="_blank"
            rel="noreferrer noopener"
            className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-4 py-2.5 text-sm"
          >
            <Github className="h-4 w-4" /> GitHub 项目
          </a>
        </div>

        {spaces.isPending ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl bg-[var(--color-bg-tertiary)]" />)}
          </div>
        ) : spaces.data?.items.length ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {spaces.data.items.map((space) => (
              <Link
                key={space.id}
                to={`/docs/${space.slug}/${space.defaultVersion?.version ?? 'latest'}`}
                className="group flex min-h-56 flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-6 transition duration-200 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  {space.iconUrl ? (
                    <img src={space.iconUrl} alt="" className="h-12 w-12 rounded-xl object-contain" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                      <Box className="h-6 w-6" />
                    </span>
                  )}
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">
                    {space.defaultVersion?.label ?? 'Latest'}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-[var(--color-text-primary)]">{space.name}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                  {space.description || '查看项目安装、使用、配置和故障排查文档。'}
                </p>
                <div className="mt-auto flex items-center justify-between pt-6 text-sm">
                  <span className="text-[var(--color-text-muted)]">{space.documentCount} 篇文档</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)]">
                    浏览文档 <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--color-border)] p-10 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-[var(--color-text-muted)]" />
            <h3 className="mt-4 font-semibold text-[var(--color-text-primary)]">文档中心正在建设中</h3>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">管理员可以在后台“文档中心”创建第一个项目空间。</p>
          </div>
        )}
      </section>

      <section id="help" className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <CircleHelp className="h-6 w-6 text-[var(--color-primary)]" />
            <div>
              <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">帮助中心</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">从常用场景快速找到解决方案。</p>
            </div>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HELP_TOPICS.map((topic) => {
              const Icon = topic.icon;
              return (
                <button
                  key={topic.title}
                  type="button"
                  onClick={() => {
                    setSearch(topic.query);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="nowen-focus rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-5 text-left transition hover:border-[color-mix(in_srgb,var(--color-primary)_38%,var(--color-border))] hover:bg-[var(--color-glass-hover)]"
                >
                  <Icon className="h-5 w-5 text-[var(--color-primary)]" />
                  <h3 className="mt-4 font-semibold text-[var(--color-text-primary)]">{topic.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{topic.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
