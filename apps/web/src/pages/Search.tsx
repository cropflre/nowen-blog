import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react';
import { api } from '../lib/api';
import { ArticleCard } from '../components/post/ArticleCard';
import { Seo } from '../components/seo/Seo';

const PAGE_SIZE = 12;

function parsePage(value: string | null): number {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function Search() {
  const [params, setParams] = useSearchParams();
  const term = (params.get('q') ?? '').trim();
  const page = parsePage(params.get('page'));
  const [input, setInput] = useState(term);

  useEffect(() => setInput(term), [term]);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ['search', term, page],
    queryFn: () => api.search(term, { page, pageSize: PAGE_SIZE }),
    enabled: term.length > 0,
    placeholderData: keepPreviousData,
  });
  const { data: settings } = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? PAGE_SIZE)));
  const visiblePages = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }, [page, totalPages]);

  const navigateSearch = (nextTerm: string, nextPage = 1) => {
    const clean = nextTerm.trim();
    if (!clean) {
      setParams({});
      return;
    }
    const next = new URLSearchParams();
    next.set('q', clean);
    if (nextPage > 1) next.set('page', String(nextPage));
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const base = term ? `搜索：${term}` : '搜索';
  const title = settings?.siteTitle ? `${base} - ${settings.siteTitle}` : base;

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12">
      <Seo title={title} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fg">搜索文章</h1>
        <p className="mt-2 text-sm text-muted">支持标题、摘要和正文全文检索。</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          navigateSearch(input, 1);
        }}
        className="relative mb-8 max-w-2xl"
      >
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          autoFocus
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="输入关键词搜索文章…"
          className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-24 text-sm outline-none transition focus:border-brand"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          搜索
        </button>
      </form>

      {term.length === 0 ? (
        <div className="rounded-card border border-dashed border-line p-10 text-center text-muted">
          输入关键词开始搜索。
        </div>
      ) : isError ? (
        <div className="rounded-card border border-red-500/30 bg-red-500/10 p-6 text-red-400">
          搜索出错了：{error instanceof Error ? error.message : '未知错误'}
        </div>
      ) : !data && isFetching ? (
        <p className="text-muted">搜索中…</p>
      ) : (data?.items.length ?? 0) === 0 ? (
        <div className="rounded-card border border-dashed border-line p-10 text-center text-muted">
          没有找到与“{term}”相关的文章。
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p>
              找到 <strong className="text-fg">{data!.total}</strong> 篇与“{term}”相关的文章
            </p>
            <p>
              第 {data!.page} / {totalPages} 页{isFetching ? ' · 更新中…' : ''}
            </p>
          </div>

          <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${isFetching ? 'opacity-60' : ''}`}>
            {data!.items.map((post) => (
              <ArticleCard key={post.id} post={post} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav aria-label="搜索结果分页" className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => navigateSearch(term, page - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm transition hover:border-brand/60 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />上一页
              </button>
              {visiblePages[0] && visiblePages[0] > 1 && <span className="px-1 text-muted">…</span>}
              {visiblePages.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-current={value === page ? 'page' : undefined}
                  onClick={() => navigateSearch(term, value)}
                  className={`h-9 min-w-9 rounded-lg border px-2 text-sm transition ${
                    value === page
                      ? 'border-brand bg-brand text-white'
                      : 'border-line text-muted hover:border-brand/60 hover:text-fg'
                  }`}
                >
                  {value}
                </button>
              ))}
              {visiblePages.at(-1) && visiblePages.at(-1)! < totalPages && <span className="px-1 text-muted">…</span>}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => navigateSearch(term, page + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm transition hover:border-brand/60 disabled:opacity-40"
              >
                下一页<ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
