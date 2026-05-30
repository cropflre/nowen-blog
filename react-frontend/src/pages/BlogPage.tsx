import { useEffect, useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import type { Post } from '../types';

const BlogCard = forwardRef<HTMLElement, { post: Post; index: number }>(function BlogCard({ post, index }, ref) {
  const { t } = useTranslation();
  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      layout
    >
      <Link to={`/blog/${post.slug}`} className="group block">
        <div className="relative rounded-2xl overflow-hidden glass glass-hover transition-all duration-500 flex flex-col md:flex-row">
          {/* Image */}
          <div className="relative w-full md:w-72 h-48 md:h-auto flex-shrink-0 overflow-hidden">
            <img
              src={post.cover}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 gradient-overlay-side hidden md:block" />
            <div className="absolute inset-0 gradient-overlay-dark md:hidden" />
          </div>

          {/* Content */}
          <div className="p-6 flex-1 flex flex-col justify-center">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-md text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold mb-2 text-[var(--color-text-primary)] group-hover:text-cyan-400 transition-colors duration-300">
              {post.title}
            </h3>

            {/* Summary */}
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4 line-clamp-2">
              {post.summary}
            </p>

            {/* Meta */}
            <div className="flex items-center gap-4">
              <time className="text-xs text-[var(--color-text-muted)] font-mono">{post.created_at}</time>
              <span className="text-xs text-[var(--color-text-muted)] font-mono">{t('blog.readTime', { time: post.read_time })}</span>
              <span className="ml-auto text-sm text-indigo-400 group-hover:translate-x-1 transition-transform duration-300">
                {t('blog.readMore')}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
});

export default function BlogPage() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTag, setActiveTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    api.getPosts().then((res) => {
      setPosts(res.data);
      const tags = [...new Set(res.data.flatMap((p) => p.tags.split(',').map(t => t.trim()).filter(Boolean)))];
      setAllTags(tags);
    });
  }, []);

  const filtered = activeTag
    ? posts.filter((p) => p.tags.split(',').map(t => t.trim()).includes(activeTag))
    : posts;

  return (
    <main className="relative pb-24 px-6 flex flex-col items-center" style={{ paddingTop: '200px', zIndex: 5 }}>
      <div className="w-full max-w-4xl" style={{ position: 'relative', zIndex: 5 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16 flex flex-col items-center text-center"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-indigo-500" />
            <span className="text-sm font-mono text-indigo-400 tracking-wider uppercase">{t('blog.sectionTitle')}</span>
            <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-indigo-500" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">{t('blog.heading')}</span>
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] max-w-xl leading-relaxed">
            {t('blog.description')}
          </p>
        </motion.div>

        {/* Tag filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          <button
            onClick={() => setActiveTag('')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              activeTag === ''
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                : 'text-[var(--color-text-muted)] border border-[var(--color-border-surface)] hover:border-indigo-500/50 hover:text-[var(--color-text-primary)] hover:shadow-md'
            }`}
          >
            {t('blog.all')}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag === activeTag ? '' : tag)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTag === tag
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                  : 'text-[var(--color-text-muted)] border border-[var(--color-border-surface)] hover:border-indigo-500/50 hover:text-[var(--color-text-primary)] hover:shadow-md'
              }`}
            >
              {tag}
            </button>
          ))}
        </motion.div>

        {/* Posts list */}
        <div className="flex flex-col gap-6 w-full">
          <AnimatePresence mode="popLayout">
            {filtered.map((post, i) => (
              <BlogCard key={post.id} post={post} index={i} />
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 w-full"
          >
            <div className="w-16 h-16 rounded-full glass border border-[var(--color-border-surface)] flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text-secondary)] mb-2">{t('blog.noPosts')}</h3>
            <p className="text-sm text-[var(--color-text-muted)]">{t('blog.noPostsDesc')}</p>
          </motion.div>
        )}
      </div>
    </main>
  );
}
