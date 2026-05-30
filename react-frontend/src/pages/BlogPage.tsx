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
    <main className="relative z-10 pt-28 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-indigo-500" />
            <span className="text-sm font-mono text-indigo-400 tracking-wider uppercase">{t('blog.sectionTitle')}</span>
            <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-indigo-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">{t('blog.heading')}</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] max-w-xl">
            {t('blog.description')}
          </p>
        </motion.div>

        {/* Tag filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-2 mb-10"
        >
          <button
            onClick={() => setActiveTag('')}
            className={`px-4 py-1.5 rounded-full text-sm font-mono transition-all duration-300 ${
              activeTag === ''
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                : 'text-[var(--color-text-muted)] border border-[var(--color-border-surface)] hover:border-indigo-500/50 hover:text-[var(--color-text-primary)]'
            }`}
          >
            {t('blog.all')}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag === activeTag ? '' : tag)}
              className={`px-4 py-1.5 rounded-full text-sm font-mono transition-all duration-300 ${
                activeTag === tag
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                  : 'text-[var(--color-text-muted)] border border-[var(--color-border-surface)] hover:border-indigo-500/50 hover:text-[var(--color-text-primary)]'
              }`}
            >
              {tag}
            </button>
          ))}
        </motion.div>

        {/* Posts list */}
        <div className="flex flex-col gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((post, i) => (
              <BlogCard key={post.id} post={post} index={i} />
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-[var(--color-text-muted)] py-20"
          >
            {t('blog.noPosts')}
          </motion.p>
        )}
      </div>
    </main>
  );
}
