import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ArticleCard } from '../components/post/ArticleCard';
import { Seo } from '../components/seo/Seo';

const TITLE: Record<string, string> = {
  category: '分类文章',
  tag: '标签文章',
};

export function Posts({ taxonomy }: { taxonomy?: 'category' | 'tag' }) {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));

  const params =
    taxonomy === 'category'
      ? { category: slug, page }
      : taxonomy === 'tag'
        ? { tag: slug, page }
        : { page };

  const { data, isLoading } = useQuery({
    queryKey: ['posts', params],
    queryFn: () => api.listPosts(params),
  });

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const goPage = (p: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p <= 1) next.delete('page');
      else next.set('page', String(p));
      return next;
    });
  };

  const heading = taxonomy ? TITLE[taxonomy] : '全部文章';

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12">
      <Seo title={heading} />
      <h1 className="mb-8 text-2xl font-bold">{heading}</h1>

      {isLoading ? (
        <p className="text-muted">加载中…</p>
      ) : (data?.items.length ?? 0) === 0 ? (
        <p className="text-muted">暂无文章。</p>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            {data!.items.map((p) => (
              <ArticleCard key={p.id} post={p} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4 text-sm">
              <button
                onClick={() => goPage(page - 1)}
                disabled={page <= 1}
                className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
              >
                上一页
              </button>
              <span className="text-muted">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => goPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
