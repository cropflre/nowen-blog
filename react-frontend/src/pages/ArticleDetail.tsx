import { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ArrowLeft, Clock, Eye, Share2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import CommentSection from '../components/CommentSection';
import type { Post } from '../types';

function ArticleSkeleton() {
  return (
    <div className="animate-pulse space-y-7">
      <div className="h-4 w-48 rounded bg-[var(--color-bg-secondary)]" />
      <div className="space-y-3">
        <div className="h-12 w-full rounded bg-[var(--color-bg-secondary)]" />
        <div className="h-12 w-2/3 rounded bg-[var(--color-bg-secondary)]" />
      </div>
      <div className="border-t border-[var(--color-border-surface)] pt-8 space-y-4">
        <div className="h-4 w-full rounded bg-[var(--color-bg-secondary)]" />
        <div className="h-4 w-11/12 rounded bg-[var(--color-bg-secondary)]" />
        <div className="h-4 w-4/5 rounded bg-[var(--color-bg-secondary)]" />
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ArticleDetail() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  useEffect(() => {
    if (!slug) {
      setError(true);
      setLoading(false);
      return;
    }

    api
      .getPublicPost(slug)
      .then(setArticle)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const tags = article?.tags
    ? article.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="minimal-kicker">404</p>
          <h1 className="text-3xl font-semibold">文章未找到</h1>
          <button type="button" onClick={() => navigate('/blog')} className="minimal-button mt-8">
            <ArrowLeft size={15} />
            返回博客
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-24 pb-24">
      <motion.div className="fixed left-0 right-0 top-0 z-[60] h-0.5 origin-left bg-[var(--color-accent)]" style={{ scaleX }} />

      <div className="page-narrow">
        <button type="button" onClick={() => navigate('/blog')} className="minimal-button mb-12">
          <ArrowLeft size={15} />
          返回博客
        </button>

        {loading || !article ? (
          <ArticleSkeleton />
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <header className="border-b border-[var(--color-border-surface)] pb-10">
              <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} />
                  {article.read_time} min
                </span>
                <span>{formatDate(article.created_at)}</span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye size={14} />
                  {article.view_count}
                </span>
              </div>

              <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">{article.title}</h1>

              {tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="minimal-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: article.title, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="minimal-button mt-8"
              >
                <Share2 size={15} />
                分享
              </button>
            </header>

            <article className="minimal-prose mt-10">
              {article.html_content ? <div dangerouslySetInnerHTML={{ __html: article.html_content }} /> : <ReactMarkdown>{article.content}</ReactMarkdown>}
            </article>

            <CommentSection postId={article.id} />

            <footer className="mt-16 border-t border-[var(--color-border-surface)] pt-8">
              <button type="button" onClick={() => navigate('/blog')} className="minimal-button">
                <ArrowLeft size={15} />
                返回列表
              </button>
            </footer>
          </motion.div>
        )}
      </div>
    </main>
  );
}
