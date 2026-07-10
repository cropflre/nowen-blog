import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock } from 'lucide-react';
import type { PostSummary } from '../../types';
import { formatDate } from '../../lib/format';
import { cn } from '../../lib/cn';
import { Highlight } from './Highlight';

export type ArticleCardVariant = 'default' | 'home-featured' | 'home-standard' | 'home-compact';

export function ArticleCard({
  post,
  featured = false,
  variant = 'default',
}: {
  post: PostSummary;
  featured?: boolean;
  variant?: ArticleCardVariant;
}) {
  const isHome = variant !== 'default';
  const isCompact = variant === 'home-compact';
  const showCover = Boolean(post.coverUrl) && !isCompact;

  return (
    <Link
      to={`/posts/${post.slug}`}
      className={cn(
        'group nowen-focus block overflow-hidden',
        isHome
          ? 'nowen-card flex h-full flex-col'
          : 'rounded-card border border-line bg-surface transition hover:-translate-y-0.5 hover:border-brand/60',
        featured && variant === 'default' && 'md:col-span-2',
        variant === 'home-featured' && 'min-h-[26rem]',
        variant === 'home-standard' && 'min-h-[22rem]',
        isCompact && 'min-h-36 p-5',
      )}
    >
      {showCover && (
        <div className={cn('overflow-hidden', variant === 'home-featured' ? 'aspect-[16/8]' : 'aspect-[16/9]')}>
          <img
            src={post.coverUrl!}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.035]"
          />
          {isHome && (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/25 to-transparent" />
          )}
        </div>
      )}

      <div className={cn('flex flex-1 flex-col', isCompact ? '' : isHome ? 'p-6' : 'p-5')}>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
          {post.categories.slice(0, isCompact ? 2 : 3).map((category) => (
            <span
              key={category.id}
              className={cn(isHome ? 'nowen-tag truncate px-2 py-1' : 'rounded-full border border-line px-2 py-0.5')}
              style={{ color: category.color ?? undefined }}
              title={category.name}
            >
              {category.name}
            </span>
          ))}
          {isCompact && <span className="ml-auto font-mono tabular-nums">{formatDate(post.publishedAt)}</span>}
        </div>

        <div className="flex items-start gap-3">
          <h3
            className={cn(
              'min-w-0 flex-1 font-semibold tracking-[-0.015em] text-[var(--color-text-primary)] transition group-hover:text-[var(--color-primary)]',
              variant === 'home-featured' ? 'text-xl leading-8 md:text-2xl' : isCompact ? 'line-clamp-2 text-base leading-6' : 'text-lg',
            )}
            title={post.title}
          >
            {post.titleHighlight ? <Highlight text={post.titleHighlight} /> : post.title}
          </h3>
          {isHome && (
            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]" />
          )}
        </div>

        {!isCompact && (post.snippet ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            <Highlight text={post.snippet} />
          </p>
        ) : post.summary ? (
          <p className={cn('mt-3 text-sm leading-6 text-[var(--color-text-secondary)]', variant === 'home-featured' ? 'line-clamp-3' : 'line-clamp-2')}>
            {post.summary}
          </p>
        ) : null)}

        <div className="mt-auto flex items-center gap-3 pt-5 text-xs text-[var(--color-text-muted)]">
          {!isCompact && <span className="font-mono tabular-nums">{formatDate(post.publishedAt)}</span>}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {post.readingTime} 分钟
          </span>
          <span className="font-mono tabular-nums">{post.viewCount} 阅读</span>
        </div>
      </div>
    </Link>
  );
}
