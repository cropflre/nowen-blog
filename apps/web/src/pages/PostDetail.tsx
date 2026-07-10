import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Markdown } from '../components/markdown/Markdown';
import { Seo } from '../components/seo/Seo';
import { absUrl } from '../lib/seo';
import { formatDate } from '../lib/format';
import { CommentList } from '../components/comments/CommentList';
import { CommentForm } from '../components/comments/CommentForm';
import type { PostDetail as PostDetailData } from '../types';

export function PostDetail() {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [commentPage, setCommentPage] = useState(1);
  const { data: post, isLoading } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => api.getPost(slug!),
    enabled: !!slug,
  });
  const { data: settings } = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });

  useEffect(() => {
    if (!post?.slug) return;
    let cancelled = false;
    void api
      .trackPostView(post.slug)
      .then((result) => {
        if (cancelled) return;
        queryClient.setQueryData<PostDetailData>(['post', slug], (current) =>
          current ? { ...current, viewCount: result.viewCount } : current,
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [post?.slug, queryClient, slug]);

  if (isLoading) {
    return <div className="mx-auto max-w-[760px] px-4 py-20 text-muted">加载中…</div>;
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-[760px] px-4 py-20">
        <p className="text-lg">文章不存在或已被删除。</p>
        <Link to="/posts" className="mt-4 inline-block text-brand">返回文章列表</Link>
      </div>
    );
  }

  const seoDescription = post.seoDescription || post.summary || settings?.defaultSeoDescription;
  const seoImage = post.coverUrl || settings?.defaultOgImage;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.seoTitle || post.title,
    ...(seoDescription ? { description: seoDescription } : {}),
    ...(seoImage ? { image: absUrl(seoImage) } : {}),
    author: { '@type': 'Person', name: post.author.username },
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': absUrl(`/posts/${post.slug}`) },
    url: absUrl(`/posts/${post.slug}`),
  };

  return (
    <article className="mx-auto max-w-[760px] px-4 py-12">
      <Seo
        title={post.seoTitle || post.title}
        description={seoDescription}
        canonical={post.canonicalUrl || `/posts/${post.slug}`}
        image={seoImage}
        type="article"
        jsonLd={jsonLd}
      />

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {post.categories.map((category) => (
          <Link key={category.id} to={`/categories/${category.slug}`} className="rounded-full border border-line px-2 py-0.5 text-muted transition hover:text-brand">
            {category.name}
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
          {post.tags.map((tag) => (
            <Link key={tag.id} to={`/tags/${tag.slug}`} className="rounded-full border border-line px-3 py-1 text-sm text-muted transition hover:text-brand">
              {tag.name}
            </Link>
          ))}
        </div>
      )}

      {settings?.commentsEnabled !== false && (
        <section className="mt-12 border-t border-line pt-8">
          <h2 className="mb-6 text-2xl font-bold text-fg">评论</h2>
          <CommentForm postSlug={post.slug} />
          <div className="mt-8">
            <CommentList postSlug={post.slug} page={commentPage} onPageChange={setCommentPage} />
          </div>
        </section>
      )}
    </article>
  );
}
