import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { ArticleCard } from '../components/post/ArticleCard';

export function Home() {
  const settings = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });
  const featured = useQuery({ queryKey: ['featured'], queryFn: api.listFeatured });
  const latest = useQuery({
    queryKey: ['posts', 'latest'],
    queryFn: () => api.listPosts({ pageSize: 9 }),
  });

  return (
    <div>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1120px] px-4 py-20 text-center">
          <h1 className="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-4xl font-bold text-transparent md:text-6xl">
            {settings.data?.siteTitle ?? 'NOWEN Blog'}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            {settings.data?.slogan ?? 'Write. Build. Share.'}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              to="/posts"
              className="rounded-lg bg-gradient-to-r from-brand to-brand-2 px-5 py-2.5 text-white transition hover:opacity-90"
            >
              阅读文章
            </Link>
            <Link
              to="/about"
              className="rounded-lg border border-line px-5 py-2.5 transition hover:border-brand/60"
            >
              关于我
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-4 py-12">
        <h2 className="mb-6 text-xl font-semibold">精选文章</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {(featured.data?.items ?? []).map((p) => (
            <ArticleCard key={p.id} post={p} featured />
          ))}
        </div>

        <h2 className="mb-6 mt-14 text-xl font-semibold">最新文章</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {(latest.data?.items ?? []).map((p) => (
            <ArticleCard key={p.id} post={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
