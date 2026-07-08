import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { AdminCategoryInput, AdminCategoryView } from '../../types';

function ColorDot({ color }: { color: string | null }) {
  return (
    <span
      className="inline-block h-3 w-3 rounded-full align-middle"
      style={{ background: color ?? 'transparent', border: '1px solid rgba(128,128,128,0.5)' }}
    />
  );
}

const EMPTY: AdminCategoryInput = { name: '', slug: '', description: '', color: '', sortOrder: 0 };

export function AdminCategories() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: api.listAdminCategories,
  });
  const [mode, setMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [editing, setEditing] = useState<AdminCategoryView | null>(null);
  const [form, setForm] = useState<AdminCategoryInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setMode('create');
    setError(null);
  };
  const openEdit = (c: AdminCategoryView) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? '',
      color: c.color ?? '',
      sortOrder: c.sortOrder,
    });
    setMode('edit');
    setError(null);
  };
  const close = () => {
    setMode('idle');
    setEditing(null);
    setForm(EMPTY);
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
    qc.invalidateQueries({ queryKey: ['categories'] });
  };

  const submit = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError('名称必填');
      return;
    }
    setBusy(true);
    try {
      if (editing) await api.updateAdminCategory(editing.id, form);
      else await api.createAdminCategory(form);
      refresh();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (c: AdminCategoryView) => {
    if (!confirm(`确定删除分类「${c.name}」？`)) return;
    setError(null);
    try {
      await api.deleteAdminCategory(c.id);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  };

  const items = data?.items ?? [];
  const fieldCls =
    'w-full rounded-lg border border-line bg-bg px-3 py-2 text-fg outline-none focus:border-brand/60';
  const labelCls = 'mb-1 block text-sm font-medium text-fg';

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">分类管理</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          新建分类
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {mode !== 'idle' && (
        <div className="mb-6 rounded-card border border-line bg-surface p-5">
          <h2 className="mb-4 text-lg font-semibold">{editing ? '编辑分类' : '新建分类'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>名称 *</label>
              <input className={fieldCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <input className={fieldCls} value={form.slug ?? ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="留空则自动生成" />
            </div>
            <div>
              <label className={labelCls}>颜色</label>
              <input className={fieldCls} value={form.color ?? ''} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="#rrggbb" />
            </div>
            <div>
              <label className={labelCls}>排序</label>
              <input type="number" className={fieldCls} value={form.sortOrder ?? 0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>描述</label>
              <textarea className={fieldCls} rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={submit} disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">
              {busy ? '保存中…' : '保存'}
            </button>
            <button onClick={close} className="rounded-lg border border-line px-4 py-2 text-sm transition hover:border-brand/60">
              取消
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted">加载中…</p>
      ) : items.length === 0 ? (
        <p className="text-muted">暂无分类。</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">名称</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">描述</th>
                <th className="px-4 py-3 font-medium">排序</th>
                <th className="px-4 py-3 font-medium">文章数</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <span className="mr-2"><ColorDot color={c.color} /></span>
                    <span className="font-medium text-fg">{c.name}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">/{c.slug}</td>
                  <td className="px-4 py-3 text-muted">{c.description || '—'}</td>
                  <td className="px-4 py-3 text-muted">{c.sortOrder}</td>
                  <td className="px-4 py-3 text-muted">{c.postCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="rounded-lg border border-line px-2.5 py-1 text-xs transition hover:border-brand/60">编辑</button>
                      <button
                        onClick={() => onDelete(c)}
                        className="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
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
    </div>
  );
}
