import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { PostSummary } from '../../types';
import { formatDate } from '../../lib/format';
import { cn } from '../../lib/cn';
import { Highlight } from './Highlight';

export function ArticleCard({
  post,
  featured = false,
}: {
  post: PostSummary;
  featured?: boolean;
}) {
  return (
    <Link
      to={`/posts/${post.slug}`}
      className={cn(
        'group block overflow-hidden rounded-card border border-line bg-surface transition hover:-translate-y-0.5 hover:border-brand/60',
        featured && 'md:col-span-2',
      )}
    >
      {post.coverUrl && (
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={post.coverUrl}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          {post.categories.map((c) => (
            <span
              key={c.id}
              className="rounded-full border border-line px-2 py-0.5"
              style={{ color: c.color ?? undefined }}
            >
              {c.name}
            </span>
          ))}
        </div>
        <h3 className="text-lg font-semibold text-fg transition group-hover:text-brand">
          {post.title}
        </h3>
        {post.snippet ? (
          <p className="mt-2 line-clamp-3 text-sm text-muted">
            <Highlight text={post.snippet} />
          </p>
        ) : post.summary ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted">{post.summary}</p>
        ) : null}
        <div className="mt-4 flex items-center gap-3 text-xs text-muted">
          <span>{formatDate(post.publishedAt)}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {post.readingTime} 分钟
          </span>
          <span>{post.viewCount} 阅读</span>
        </div>
      </div>
    </Link>
  );
}
