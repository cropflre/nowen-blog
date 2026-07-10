import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { AdminCommentView, CommentStatus } from '../../types';

const PAGE_SIZE = 20;

type StatusFilter = CommentStatus | 'all';

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'spam', label: '垃圾评论' },
];

const STATUS_LABEL: Record<CommentStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  spam: '垃圾评论',
};

const STATUS_STYLE: Record<CommentStatus, string> = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  rejected: 'border-red-500/40 bg-red-500/10 text-red-400',
  spam: 'border-violet-500/40 bg-violet-500/10 text-violet-400',
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** 后端已将评论内容转义；这里解码为纯文本，再交给 React 二次转义输出。 */
function decodeEscapedHtml(value: string): string {
  if (typeof document === 'undefined') return value;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function ActionButton({
  children,
  disabled,
  onClick,
  tone = 'default',
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tone?: 'default' | 'success' | 'danger' | 'warning';
}) {
  const toneClass = {
    default: 'border-line text-muted hover:border-brand/60 hover:text-fg',
    success: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10',
    danger: 'border-red-500/40 text-red-400 hover:bg-red-500/10',
    warning: 'border-violet-500/40 text-violet-400 hover:bg-violet-500/10',
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      {children}
    </button>
  );
}

export function AdminComments() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'comments', { filter, page }],
    queryFn: () =>
      api.listAdminComments({
        page,
        pageSize: PAGE_SIZE,
        status: filter,
      }),
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const runAction = async (
    comment: AdminCommentView,
    label: string,
    action: () => Promise<unknown>,
  ): Promise<boolean> => {
    setBusyId(comment.id);
    setError(null);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'comments'] });
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? `${label}失败：${cause.message}` : `${label}失败`);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const deleteComment = async (comment: AdminCommentView) => {
    if (!confirm(`确定删除 ${comment.authorName} 的这条评论吗？删除后不会在后台列表中显示。`)) {
      return;
    }
    const deleted = await runAction(comment, '删除', () => api.deleteAdminComment(comment.id));
    if (deleted && (query.data?.items.length ?? 0) === 1 && page > 1) {
      setPage((current) => current - 1);
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-brand" />
            <h1 className="text-2xl font-bold">评论管理</h1>
          </div>
          <p className="mt-2 text-sm text-muted">审核读者评论，处理垃圾内容并查看安全审计信息。</p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-4 py-2 text-sm text-muted">
          当前筛选共 <span className="font-semibold text-fg">{total}</span> 条
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setFilter(item.value);
              setPage(1);
            }}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              filter === item.value
                ? 'border-brand/60 bg-brand/10 text-brand'
                : 'border-line text-muted hover:text-fg'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {query.isLoading ? (
        <div className="rounded-card border border-line bg-surface px-6 py-16 text-center text-muted">
          加载评论中…
        </div>
      ) : query.isError ? (
        <div className="rounded-card border border-red-500/30 bg-red-500/10 px-6 py-10 text-center text-red-400">
          评论加载失败：{query.error instanceof Error ? query.error.message : '未知错误'}
        </div>
      ) : (query.data?.items.length ?? 0) === 0 ? (
        <div className="rounded-card border border-line bg-surface px-6 py-16 text-center text-muted">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-40" />
          当前筛选下暂无评论。
        </div>
      ) : (
        <div className="space-y-4">
          {query.data!.items.map((comment) => {
            const busy = busyId === comment.id;
            return (
              <article key={comment.id} className="rounded-card border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-fg">{comment.authorName}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[comment.status]}`}>
                        {STATUS_LABEL[comment.status]}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                      <span>{comment.authorEmail}</span>
                      <span>{formatDateTime(comment.createdAt)}</span>
                      <span>文章：{comment.postTitle ?? comment.postId}</span>
                    </div>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-fg/90">
                  {decodeEscapedHtml(comment.content)}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {comment.status !== 'approved' && (
                    <ActionButton
                      disabled={busy}
                      tone="success"
                      onClick={() => void runAction(comment, '批准', () => api.approveAdminComment(comment.id))}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      批准
                    </ActionButton>
                  )}
                  {comment.status !== 'rejected' && (
                    <ActionButton
                      disabled={busy}
                      tone="danger"
                      onClick={() => void runAction(comment, '拒绝', () => api.rejectAdminComment(comment.id))}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      拒绝
                    </ActionButton>
                  )}
                  {comment.status !== 'spam' && (
                    <ActionButton
                      disabled={busy}
                      tone="warning"
                      onClick={() =>
                        void runAction(comment, '标记垃圾评论', () =>
                          api.markAdminCommentSpam(comment.id),
                        )
                      }
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      标记垃圾
                    </ActionButton>
                  )}
                  {comment.status !== 'pending' && (
                    <ActionButton
                      disabled={busy}
                      onClick={() =>
                        void runAction(comment, '恢复待审核', () =>
                          api.updateAdminComment(comment.id, { status: 'pending' }),
                        )
                      }
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      转为待审核
                    </ActionButton>
                  )}
                  <ActionButton disabled={busy} tone="danger" onClick={() => void deleteComment(comment)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </ActionButton>
                </div>

                <details className="mt-4 rounded-lg border border-line/80 bg-bg/40 px-4 py-3 text-xs">
                  <summary className="cursor-pointer select-none text-muted">查看审计信息</summary>
                  <dl className="mt-3 grid gap-3 text-muted sm:grid-cols-2">
                    <div>
                      <dt className="text-fg/70">评论 ID</dt>
                      <dd className="mt-1 break-all">{comment.id}</dd>
                    </div>
                    <div>
                      <dt className="text-fg/70">IP Hash</dt>
                      <dd className="mt-1 break-all">{comment.ipHash ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-fg/70">个人网站</dt>
                      <dd className="mt-1 break-all">
                        {comment.authorWebsite ? (
                          <a
                            href={comment.authorWebsite}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand hover:underline"
                          >
                            {comment.authorWebsite}
                          </a>
                        ) : (
                          '—'
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-fg/70">审核时间</dt>
                      <dd className="mt-1">{comment.approvedAt ? formatDateTime(comment.approvedAt) : '—'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-fg/70">User-Agent</dt>
                      <dd className="mt-1 break-all">{comment.userAgent ?? '—'}</dd>
                    </div>
                  </dl>
                </details>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1 || query.isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-muted transition hover:text-fg disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            上一页
          </button>
          <span className="text-muted">
            第 {page} / {totalPages} 页
          </span>
          <button
            type="button"
            disabled={page >= totalPages || query.isFetching}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-muted transition hover:text-fg disabled:opacity-40"
          >
            下一页
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
