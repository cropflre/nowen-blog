import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Eye, EyeOff, Pin, RotateCcw, Star } from 'lucide-react';
import { api } from '../../lib/api';
import { adminPostWorkflowApi } from '../../lib/adminPostWorkflowApi';
import { formatDate } from '../../lib/format';
import type { PostStatus } from '../../types';

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: '草稿',
  scheduled: '定时发布',
  published: '已发布',
  archived: '已归档',
};

const STATUS_BADGE: Record<PostStatus, string> = {
  draft: 'border-line text-muted',
  scheduled: 'border-sky-500/40 bg-sky-500/10 text-sky-400',
  published: 'border-brand/50 bg-brand/10 text-brand',
  archived: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
};

const FILTERS: { value: PostStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'scheduled', label: '定时发布' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
];

export function AdminPosts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<PostStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'posts', { filter, page }],
    queryFn: () => api.listAdminPosts({ status: filter, page, pageSize: 10 }),
  });

  const total = query.data?.total ?? 0;
  const pageSize = query.data?.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const act = async (id: string, action: () => Promise<unknown>, label: string) => {
    setError(null);
    setBusyId(id);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
    } catch (cause) {
      setError(cause instanceof Error ? `${label}失败：${cause.message}` : `${label}失败`);
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = (id: string, title: string) => {
    if (!confirm(`确定永久删除文章「${title}」？版本历史和访问数据也会一并删除。`)) return;
    void act(id, () => api.deleteAdminPost(id), '删除');
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">文章管理</h1>
          <p className="mt-1 text-sm text-muted">管理草稿、定时发布、线上文章和归档内容。</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/posts/new')}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          新建文章
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setFilter(item.value);
              setPage(1);
            }}
            className={`rounded-lg border px-3 py-1.5 transition ${
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
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {query.isLoading ? (
        <p className="text-muted">加载中…</p>
      ) : (query.data?.items.length ?? 0) === 0 ? (
        <div className="rounded-card border border-line bg-surface px-6 py-16 text-center text-muted">
          当前筛选下暂无文章。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-surface text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">标题</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">可见性</th>
                <th className="px-4 py-3 font-medium">属性</th>
                <th className="px-4 py-3 font-medium">分类 / 标签</th>
                <th className="px-4 py-3 font-medium">发布计划</th>
                <th className="px-4 py-3 font-medium">更新时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {query.data!.items.map((post) => (
                <tr key={post.id} className="border-t border-line align-top">
                  <td className="px-4 py-3">
                    <div className="max-w-[260px] truncate font-medium text-fg">{post.title}</div>
                    <div className="mt-1 max-w-[260px] truncate text-xs text-muted">/{post.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_BADGE[post.status]}`}>
                      {STATUS_LABEL[post.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      {post.visibility === 'public' ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {post.visibility === 'public' ? '公开' : '私密'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {post.isFeatured && <span className="inline-flex items-center gap-1 text-amber-400"><Star className="h-3.5 w-3.5" />精选</span>}
                      {post.isPinned && <span className="inline-flex items-center gap-1 text-brand"><Pin className="h-3.5 w-3.5" />置顶</span>}
                      {!post.isFeatured && !post.isPinned && <span className="text-muted">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    <div>{post.categories.map((item) => item.name).join('、') || '无分类'}</div>
                    <div className="mt-1">{post.tags.map((item) => `#${item.name}`).join(' ') || '无标签'}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {post.status === 'scheduled'
                      ? formatDate(post.scheduledAt) || '—'
                      : formatDate(post.publishedAt) || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(post.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        to={`/admin/posts/${post.id}/edit`}
                        className="rounded-lg border border-line px-2.5 py-1 text-xs transition hover:border-brand/60"
                      >
                        编辑
                      </Link>
                      {post.status === 'archived' ? (
                        <button
                          type="button"
                          disabled={busyId === post.id}
                          onClick={() => void act(post.id, () => adminPostWorkflowApi.restore(post.id), '恢复')}
                          className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs transition hover:border-brand/60 disabled:opacity-40"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />恢复
                        </button>
                      ) : (
                        <>
                          {post.status === 'published' ? (
                            <button
                              type="button"
                              disabled={busyId === post.id}
                              onClick={() => void act(post.id, () => api.unpublishAdminPost(post.id), '取消发布')}
                              className="rounded-lg border border-line px-2.5 py-1 text-xs transition hover:border-brand/60 disabled:opacity-40"
                            >
                              转为草稿
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === post.id}
                              onClick={() => void act(post.id, () => api.publishAdminPost(post.id), '发布')}
                              className="rounded-lg border border-line px-2.5 py-1 text-xs transition hover:border-brand/60 disabled:opacity-40"
                            >
                              立即发布
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === post.id}
                            onClick={() => void act(post.id, () => adminPostWorkflowApi.archive(post.id), '归档')}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 px-2.5 py-1 text-xs text-amber-400 transition hover:bg-amber-500/10 disabled:opacity-40"
                          >
                            <Archive className="h-3.5 w-3.5" />归档
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={busyId === post.id}
                        onClick={() => onDelete(post.id, post.title)}
                        className="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
          >
            上一页
          </button>
          <span className="text-muted">{page} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
