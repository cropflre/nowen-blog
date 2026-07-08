import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatMonth } from '../lib/format';
import { Seo } from '../components/seo/Seo';

export function Archive() {
  const { data } = useQuery({ queryKey: ['archive'], queryFn: api.archive });

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12">
      <Seo title="归档" />
      <h1 className="mb-8 text-2xl font-bold">归档</h1>

      {(data?.groups ?? []).map((g) => (
        <section key={g.year} className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-brand">
            {g.year} <span className="text-sm text-muted">({g.total})</span>
          </h2>
          {g.months.map((m) => (
            <div key={m.month} className="mb-6">
              <h3 className="mb-2 text-sm text-muted">{formatMonth(m.month)}</h3>
              <ul className="space-y-1.5">
                {m.posts.map((p) => (
                  <li key={p.id}>
                    <Link to={`/posts/${p.slug}`} className="text-fg transition hover:text-brand">
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
