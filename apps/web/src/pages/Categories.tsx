import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Seo } from '../components/seo/Seo';

export function Categories() {
  const { data } = useQuery({ queryKey: ['categories'], queryFn: api.listCategories });
  const { data: settings } = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });
  const title = settings?.siteTitle ? `分类 - ${settings.siteTitle}` : '分类';

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12">
      <Seo title={title} />
      <h1 className="mb-8 text-2xl font-bold">分类</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.items ?? []).map((c) => (
          <Link
            key={c.id}
            to={`/categories/${c.slug}`}
            className="rounded-card border border-line bg-surface p-5 transition hover:border-brand/60"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold" style={{ color: c.color ?? undefined }}>
                {c.name}
              </span>
              <span className="text-sm text-muted">{c.postCount}</span>
            </div>
            {c.description && <p className="mt-2 text-sm text-muted">{c.description}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
