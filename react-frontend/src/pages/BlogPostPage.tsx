import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import type { Post } from '../types';

export default function BlogPostPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getPost(slug)
      .then(setPost)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 pt-24">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('blogPost.notFound')}</h1>
        <Link to="/blog" className="text-indigo-400 hover:text-indigo-300">← {t('blogPost.back')}</Link>
      </div>
    );
  }

  return (
    <main className="relative z-10 pt-28 pb-24 px-6">
      <article className="max-w-3xl mx-auto">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-cyan-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('blogPost.back')}
          </Link>
        </motion.div>

        {/* Cover image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl overflow-hidden mb-10"
        >
          <img
            src={post.cover}
            alt={post.title}
            className="w-full h-64 md:h-80 object-cover"
          />
          <div className="absolute inset-0 gradient-overlay-dark" />
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-10"
        >
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-lg text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            <span className="gradient-text">{post.title}</span>
          </h1>

          <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
            <time className="font-mono">{post.created_at}</time>
            <span className="w-1 h-1 rounded-full bg-[var(--color-text-muted)]" />
            <span className="font-mono">{t('blog.readTime', { time: post.read_time })}</span>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="prose prose-invert max-w-none"
        >
          <div className="glass rounded-2xl p-8 md:p-12">
            <p className="text-lg text-[var(--color-text-primary)] leading-relaxed mb-6">
              {post.summary}
            </p>
            <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent my-8" />
            {post.html_content ? (
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: post.html_content }}
              />
            ) : (
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                {post.content}
              </p>
            )}
          </div>
        </motion.div>
      </article>
    </main>
  );
}
