import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Share2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PostContext, PostDetail } from '../../types';

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  textarea.remove();
  if (!ok) throw new Error('复制失败');
}

export function PostFooter({ post, context }: { post: PostDetail; context?: PostContext }) {
  const route = `/posts/${post.slug}`;
  const [shareUrl, setShareUrl] = useState(route);
  const [copied, setCopied] = useState(false);
  const shareText = post.summary || post.title;

  useEffect(() => {
    setShareUrl(window.location.href.split('#')[0] ?? route);
  }, [route]);

  const showCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const share = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: post.title, text: shareText, url: shareUrl });
        return;
      } catch (error) {
        if (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    await copyText(shareUrl);
    showCopied();
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(post.title);

  return (
    <div className="mt-12 space-y-8 border-t border-line pt-8">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface p-4">
        <div>
          <h2 className="text-sm font-semibold text-fg">分享这篇文章</h2>
          <p className="mt-1 text-xs text-muted">把有价值的内容分享给更多人。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            <Share2 className="h-4 w-4" />
            {copied ? '已复制' : '分享'}
          </button>
          <button
            type="button"
            onClick={() => void copyText(shareUrl).then(showCopied)}
            className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:border-brand/60 hover:text-fg"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
            {copied ? '已复制' : '复制链接'}
          </button>
          <a
            href={`https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedTitle}`}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:border-brand/60 hover:text-fg"
          >
            微博
          </a>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:border-brand/60 hover:text-fg"
          >
            X
          </a>
        </div>
      </section>

      {(context?.previous || context?.next) && (
        <nav aria-label="上一篇和下一篇" className="grid gap-3 sm:grid-cols-2">
          {context.previous ? (
            <Link
              to={`/posts/${context.previous.slug}`}
              className="group rounded-card border border-line bg-surface p-4 transition hover:border-brand/60"
            >
              <span className="flex items-center gap-1 text-xs text-muted"><ChevronLeft className="h-3.5 w-3.5" />上一篇</span>
              <span className="mt-2 block font-medium text-fg transition group-hover:text-brand">{context.previous.title}</span>
            </Link>
          ) : <span />}
          {context.next && (
            <Link
              to={`/posts/${context.next.slug}`}
              className="group rounded-card border border-line bg-surface p-4 text-right transition hover:border-brand/60"
            >
              <span className="flex items-center justify-end gap-1 text-xs text-muted">下一篇<ChevronRight className="h-3.5 w-3.5" /></span>
              <span className="mt-2 block font-medium text-fg transition group-hover:text-brand">{context.next.title}</span>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
