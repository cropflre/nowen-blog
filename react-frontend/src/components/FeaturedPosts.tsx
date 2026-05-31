import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import type { Post } from '../types';

function formatDate(value: string, language: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function tagsFrom(post: Post) {
  return post.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export default function FeaturedPosts({ posts }: { posts: Post[] }) {
  const { t, i18n } = useTranslation();

  return (
    <section className="border-b border-[var(--color-border-surface)] py-20 md:py-24">
      <div className="page-shell">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <span className="minimal-kicker">{t('featuredPosts.sectionTitle')}</span>
            <h2 className="minimal-section-title">{t('featuredPosts.heading')}</h2>
          </div>
          <Link to="/blog" className="minimal-button hidden sm:inline-flex">
            {t('featuredPosts.viewAll')}
            <ArrowRight size={15} />
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="minimal-card h-48 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="minimal-card flex min-h-64 flex-col rounded-2xl p-5">
                <div className="mb-5 flex flex-wrap gap-2">
                  {tagsFrom(post).map((tag) => (
                    <span key={tag} className="minimal-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="text-xl font-semibold leading-tight">{post.title}</h3>
                <p className="minimal-text mt-3 line-clamp-3 text-sm">{post.summary}</p>
                <div className="mt-auto flex items-center justify-between gap-4 pt-8 text-xs text-[var(--color-text-muted)]">
                  <time>{formatDate(post.created_at, i18n.language)}</time>
                  <span>{t('featuredPosts.readTime', { time: post.read_time })}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Link to="/blog" className="minimal-button mt-6 sm:hidden">
          {t('featuredPosts.viewAll')}
          <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
