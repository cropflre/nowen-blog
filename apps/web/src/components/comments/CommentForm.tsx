import { useState } from 'react';
import type { CommentView } from '../../types';

interface CommentFormProps {
  postSlug: string;
  onSubmitSuccess?: (comment: CommentView) => void;
}

export function CommentForm({ postSlug, onSubmitSuccess }: CommentFormProps) {
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorWebsite, setAuthorWebsite] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/posts/${postSlug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName,
          authorEmail,
          authorWebsite: authorWebsite || undefined,
          content,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || '提交失败');
      }

      setSuccess(true);
      setAuthorName('');
      setAuthorEmail('');
      setAuthorWebsite('');
      setContent('');

      if (onSubmitSuccess) {
        const comment = await res.json();
        onSubmitSuccess(comment);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
        评论已提交，等待审核通过后显示。
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-fg">发表评论</h3>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="authorName" className="mb-1 block text-sm font-medium text-fg">
            昵称 *
          </label>
          <input
            id="authorName"
            type="text"
            required
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand/60"
            placeholder="您的昵称"
          />
        </div>

        <div>
          <label htmlFor="authorEmail" className="mb-1 block text-sm font-medium text-fg">
            邮箱 *
          </label>
          <input
            id="authorEmail"
            type="email"
            required
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand/60"
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="authorWebsite" className="mb-1 block text-sm font-medium text-fg">
          网站（可选）
        </label>
        <input
          id="authorWebsite"
          type="url"
          value={authorWebsite}
          onChange={(e) => setAuthorWebsite(e.target.value)}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand/60"
          placeholder="https://example.com"
        />
      </div>

      <div>
        <label htmlFor="content" className="mb-1 block text-sm font-medium text-fg">
          评论内容 *
        </label>
        <textarea
          id="content"
          required
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand/60"
          placeholder="说点什么吧..."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? '提交中...' : '提交评论'}
      </button>
    </form>
  );
}
