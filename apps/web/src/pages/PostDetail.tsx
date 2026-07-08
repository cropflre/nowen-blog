import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Markdown } from '../components/markdown/Markdown';
import { Seo } from '../components/seo/Seo';
import { formatDate } from '../lib/format';

export function PostDetail() {
  const { slug } = useParams();
  const { data: post, isLoading } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => api.getPost(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return <div className="mx-auto max-w-[760px] px-4 py-20 text-muted">加载中…</div>;
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-[760px] px-4 py-20">
        <p className="text-lg">文章不存在或已被删除。</p>
        <Link to="/posts" className="mt-4 inline-block text-brand">
          返回文章列表
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-[760px] px-4 py-12">
      <Seo title={post.title} description={post.seoDescription ?? post.summary} />

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {post.categories.map((c) => (
          <Link
            key={c.id}
            to={`/categories/${c.slug}`}
            className="rounded-full border border-line px-2 py-0.5 text-muted transition hover:text-brand"
          >
            {c.name}
          </Link>
        ))}
      </div>

      <h1 className="text-3xl font-bold text-fg">{post.title}</h1>

      <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
        <span>{post.author.username}</span>
        <span>{formatDate(post.publishedAt)}</span>
        <span>{post.readingTime} 分钟阅读</span>
        <span>{post.viewCount} 阅读</span>
      </div>

      <hr className="my-6 border-line" />

      <Markdown content={post.contentMd} />

      {post.tags.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <Link
              key={t.id}
              to={`/tags/${t.slug}`}
              className="rounded-full border border-line px-3 py-1 text-sm text-muted transition hover:text-brand"
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
