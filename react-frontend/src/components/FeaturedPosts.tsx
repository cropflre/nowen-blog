import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Post } from '../types';
import Card3D from './Card3D';

function PostCard({ post, index }: { post: Post; index: number }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Card3D className="h-full">
        <Link to={`/blog/${post.slug}`} className="block h-full">
          <div className="relative rounded-2xl overflow-hidden glass glass-hover transition-all duration-500 h-full">
            {/* Image */}
            <div className="relative h-48 overflow-hidden">
              <img
                src={post.cover}
                alt={post.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 gradient-overlay-dark" />

              {/* Read time badge */}
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs font-mono text-slate-300 border border-white/10">
                {t('featuredPosts.readTime', { time: post.read_time })}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Tags */}
              <div className="flex gap-2 mb-3">
                {post.tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-md text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold mb-2 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-purple-300 group-hover:to-indigo-300 transition-all duration-300 line-clamp-2">
                {post.title}
              </h3>

              {/* Summary */}
              <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                {post.summary}
              </p>

              {/* Meta */}
              <div className="flex items-center justify-between">
                <time className="text-xs text-[var(--color-text-muted)] font-mono">{post.created_at}</time>
                <span className="text-sm text-indigo-400 group-hover:translate-x-1 transition-transform duration-300 flex items-center gap-1">
                  {t('featuredPosts.readMore')}
                </span>
              </div>
            </div>

            {/* Hover glow */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                 style={{ boxShadow: '0 0 40px rgba(139,92,246,0.15), inset 0 0 60px rgba(139,92,246,0.08)' }} />
          </div>
        </Link>
      </Card3D>
    </motion.article>
  );
}

export default function FeaturedPosts({ posts }: { posts: Post[] }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-24 px-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-indigo-500" />
            <span className="text-sm font-mono text-indigo-400 tracking-wider uppercase">{t('featuredPosts.sectionTitle')}</span>
            <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-indigo-500" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">
            <span className="gradient-text">{t('featuredPosts.heading')}</span>
          </h2>
        </motion.div>

        {/* Flex container - 垂直水平居中 */}
        <div className="flex flex-wrap justify-center items-center gap-6 w-full">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
            >
              <PostCard post={post} index={i} />
            </motion.div>
          ))}
        </div>

        {/* View all */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-medium bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(139,92,246,0.15)] hover:-translate-y-0.5"
          >
            {t('featuredPosts.viewAll')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
