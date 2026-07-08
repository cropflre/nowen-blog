import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Seo } from '../components/seo/Seo';

export function Tags() {
  const { data } = useQuery({ queryKey: ['tags'], queryFn: api.listTags });

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12">
      <Seo title="标签" />
      <h1 className="mb-8 text-2xl font-bold">标签</h1>
      <div className="flex flex-wrap gap-3">
        {(data?.items ?? []).map((t) => (
          <Link
            key={t.id}
            to={`/tags/${t.slug}`}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm transition hover:border-brand/60"
            style={{ color: t.color ?? undefined }}
          >
            {t.name}
            <span className="ml-1 text-muted">{t.postCount}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
