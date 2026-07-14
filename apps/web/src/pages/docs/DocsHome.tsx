import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, HelpCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { helpCenterApi } from '../../lib/helpCenterApi';
import { Seo } from '../../components/seo/Seo';

export function DocsHome() {
  const [keyword, setKeyword] = useState('');
  const centers = useQuery({ queryKey: ['help-centers'], queryFn: helpCenterApi.list });
  const search = useQuery({
    queryKey: ['help-centers', 'search', keyword.trim()],
    queryFn: () => helpCenterApi.search(keyword.trim()),
    enabled: keyword.trim().length >= 2,
  });

  const visibleCenters = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    const items = centers.data?.items ?? [];
    if (!term) return items;
    return items.filter((item) =>
      [item.name, item.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [centers.data?.items, keyword]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-bg-primary)]">
      <Seo
        title="NOWEN 帮助中心"
        description="查看 NOWEN 各项目的安装、部署、使用方法和常见问题。"
        canonical="/docs"
      />

      <section className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]">
            <HelpCircle className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-4xl">
            NOWEN 帮助中心
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
            一个项目对应一个帮助中心。选择你正在使用的产品，直接查看安装、部署、使用方法和问题排查。
          </p>
          <div className="relative mx-auto mt-7 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索项目或帮助文档"
              className="nowen-focus h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] pl-12 pr-4 text-sm text-[var(--color-text-primary)] shadow-sm"
            />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {keyword.trim().length >= 2 && (search.data?.items.length ?? 0) > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">相关帮助文档</h2>
              <span className="text-xs text-[var(--color-text-muted)]">{search.data?.items.length} 条结果</span>
            </div>
            <div className="mt-4 divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              {search.data?.items.slice(0, 8).map((item) => (
                <Link
                  key={item.id}
                  to={`/docs/${item.spaceSlug}/${item.path}`}
                  className="nowen-focus flex items-center gap-4 px-5 py-4 transition hover:bg-[var(--color-glass-hover)]"
                >
                  <BookOpen className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{item.title}</p>
                    <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
                      {item.spaceName}{item.description ? ` · ${item.description}` : ''}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">Help centers</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">选择项目</h2>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">{visibleCenters.length} 个帮助中心</span>
        </div>

        {centers.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl bg-[var(--color-bg-secondary)]" />)}
          </div>
        ) : visibleCenters.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleCenters.map((center) => (
              <Link
                key={center.id}
                to={`/docs/${center.slug}`}
                className="nowen-focus group flex min-h-52 flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                    {center.iconUrl ? <img src={center.iconUrl} alt="" className="h-8 w-8 rounded-lg object-contain" /> : <BookOpen className="h-5 w-5" />}
                  </div>
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] text-[var(--color-text-muted)]">
                    {center.documentCount} 篇
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
                  {center.name} 帮助中心
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                  {center.description || '查看安装、部署、功能使用和常见问题。'}
                </p>
                <div className="mt-auto flex items-center justify-between pt-5 text-xs text-[var(--color-text-muted)]">
                  <span>手动维护 · 官方帮助</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-16 text-center">
            <BookOpen className="mx-auto h-9 w-9 text-[var(--color-text-muted)]" />
            <p className="mt-4 font-medium text-[var(--color-text-primary)]">没有找到帮助中心</p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">可以换一个关键词，或者先在后台创建项目帮助中心。</p>
          </div>
        )}
      </main>
    </div>
  );
}
