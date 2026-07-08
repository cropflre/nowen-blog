import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { PostStatus } from '../../types';

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '归档',
};

const STATUS_BADGE: Record<PostStatus, string> = {
  draft: 'border-line text-muted',
  published: 'border-brand/50 text-brand',
  archived: 'border-amber-500/40 text-amber-400',
};

const FILTERS: { value: PostStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '归档' },
];

export function AdminPosts() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<PostStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'posts', { filter, page }],
    queryFn: () => api.listAdminPosts({ status: filter, page, pageSize: 10 }),
  });

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const act = async (id: string, fn: () => Promise<unknown>, label: string) => {
    setError(null);
    setBusyId(id);
    try {
      await fn();
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
    } catch (e) {
      setError(e instanceof Error ? `${label}失败：${e.message}` : `${label}失败`);
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = (id: string, title: string) => {
    if (!confirm(`确定删除文章「${title}」？该操作不可恢复。`)) return;
    act(id, () => api.deleteAdminPost(id), '删除');
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">文章管理</h1>
        <button
          onClick={() => navigate('/admin/posts/new')}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          新建文章
        </button>
      </div>

      <div className="mb-4 flex gap-2 text-sm">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setFilter(f.value);
              setPage(1);
            }}
            className={
              'rounded-lg border px-3 py-1.5 transition ' +
              (filter === f.value
                ? 'border-brand/60 text-brand'
                : 'border-line text-muted hover:text-fg')
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-muted">加载中…</p>
      ) : (data?.items.length ?? 0) === 0 ? (
        <p className="text-muted">暂无文章。</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">标题</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">分类</th>
                <th className="px-4 py-3 font-medium">标签</th>
                <th className="px-4 py-3 font-medium">发布时间</th>
                <th className="px-4 py-3 font-medium">更新时间</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {data!.items.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="font-medium text-fg">{p.title}</div>
                    <div className="text-xs text-muted">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={'rounded-full border px-2 py-0.5 text-xs ' + STATUS_BADGE[p.status]}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {p.categories.map((c) => c.name).join('、') || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {p.tags.map((t) => t.name).join('、') || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(p.publishedAt) || '—'}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(p.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/admin/posts/${p.id}/edit`}
                        className="rounded-lg border border-line px-2.5 py-1 text-xs transition hover:border-brand/60"
                      >
                        编辑
                      </Link>
                      {p.status === 'published' ? (
                        <button
                          disabled={busyId === p.id}
                          onClick={() => act(p.id, () => api.unpublishAdminPost(p.id), '取消发布')}
                          className="rounded-lg border border-line px-2.5 py-1 text-xs transition hover:border-brand/60 disabled:opacity-40"
                        >
                          取消发布
                        </button>
                      ) : (
                        <button
                          disabled={busyId === p.id}
                          onClick={() => act(p.id, () => api.publishAdminPost(p.id), '发布')}
                          className="rounded-lg border border-line px-2.5 py-1 text-xs transition hover:border-brand/60 disabled:opacity-40"
                        >
                          发布
                        </button>
                      )}
                      <button
                        disabled={busyId === p.id}
                        onClick={() => onDelete(p.id, p.title)}
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
          >
            上一页
          </button>
          <span className="text-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
