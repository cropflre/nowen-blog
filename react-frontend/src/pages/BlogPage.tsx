import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { api } from '../api';
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
    .filter(Boolean);
}

export default function BlogPage() {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTag, setActiveTag] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    api.getPosts().then((res) => {
      setPosts(res.data);
      setAllTags([...new Set(res.data.flatMap((post) => tagsFrom(post)))]);
    });
  }, []);

  const filtered = activeTag ? posts.filter((post) => tagsFrom(post).includes(activeTag)) : posts;

  return (
    <main className="pt-32 pb-24">
      <div className="page-narrow">
        <header className="mb-12">
          <span className="minimal-kicker">{t('blog.sectionTitle')}</span>
          <h1 className="minimal-title">{t('blog.heading')}</h1>
          <p className="minimal-text mt-6 text-lg">{t('blog.description')}</p>
        </header>

        <div className="mb-10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTag('')}
            className={activeTag === '' ? 'minimal-button-primary' : 'minimal-button'}
          >
            {t('blog.all')}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag === activeTag ? '' : tag)}
              className={activeTag === tag ? 'minimal-button-primary' : 'minimal-button'}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="divide-y divide-[var(--color-border-surface)] border-y border-[var(--color-border-surface)]">
          <AnimatePresence mode="popLayout">
            {filtered.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                layout
              >
                <Link to={`/blog/${post.slug}`} className="group block py-8">
                  <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--color-text-muted)]">
                    <time>{formatDate(post.created_at, i18n.language)}</time>
                    <span>{t('blog.readTime', { time: post.read_time })}</span>
                    {tagsFrom(post).slice(0, 3).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight transition-colors group-hover:text-[var(--color-text-secondary)]">
                    {post.title}
                  </h2>
                  <p className="minimal-text mt-3 line-clamp-2">{post.summary}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                    {t('blog.readMore')}
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <h3 className="text-lg font-semibold">{t('blog.noPosts')}</h3>
            <p className="minimal-text mt-2 text-sm">{t('blog.noPostsDesc')}</p>
          </div>
        )}
      </div>
    </main>
  );
}
