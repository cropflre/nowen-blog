import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { CommentView } from '../../types';
import { formatDate } from '../../lib/format';

interface CommentListProps {
  postSlug: string;
  page: number;
  onPageChange: (page: number) => void;
}

export function CommentList({ postSlug, page, onPageChange }: CommentListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['comments', postSlug, page],
    queryFn: () => api.getPostComments(postSlug, page),
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted">加载评论中...</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        加载评论失败，请刷新重试
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="py-8 text-center text-muted">
        <p>暂无评论</p>
        <p className="mt-1 text-sm">快来发表第一条评论吧！</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="space-y-6">
      {data.items.map((comment: CommentView) => (
        <div key={comment.id} className="border-b border-line pb-6 last:border-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium text-fg">{comment.authorName}</div>
              <div className="mt-1 text-sm text-muted">
                {formatDate(comment.createdAt)}
              </div>
            </div>
          </div>
          <div
            className="mt-3 text-sm leading-relaxed text-fg/90"
            dangerouslySetInnerHTML={{ __html: comment.content }}
          />
        </div>
      ))}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded border border-line px-3 py-1.5 text-sm disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-muted">
            第 {page} / {totalPages} 页
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded border border-line px-3 py-1.5 text-sm disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
