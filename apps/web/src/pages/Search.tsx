import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import { api } from '../lib/api';
import { ArticleCard } from '../components/post/ArticleCard';
import { Seo } from '../components/seo/Seo';

export function Search() {
  const [params] = useSearchParams();
  const initial = params.get('q') ?? '';
  const [q, setQ] = useState(initial);
  const [term, setTerm] = useState(initial);

  const { data, isFetching } = useQuery({
    queryKey: ['search', term],
    queryFn: () => api.search(term),
    enabled: term.trim().length > 0,
  });

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12">
      <Seo title={term ? `搜索：${term}` : '搜索'} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTerm(q.trim());
        }}
        className="relative mb-8 max-w-xl"
      >
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="输入关键词搜索文章…"
          className="w-full rounded-lg border border-line bg-surface py-3 pl-10 pr-4 text-sm outline-none transition focus:border-brand"
        />
      </form>

      {term.trim().length === 0 ? (
        <p className="text-muted">输入关键词开始搜索。</p>
      ) : isFetching ? (
        <p className="text-muted">搜索中…</p>
      ) : (data?.items.length ?? 0) === 0 ? (
        <p className="text-muted">没有找到与 “{term}” 相关的文章。</p>
      ) : (
        <>
          <p className="mb-6 text-sm text-muted">
            找到 {data!.total} 篇与 “{term}” 相关的文章
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {data!.items.map((p) => (
              <ArticleCard key={p.id} post={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
