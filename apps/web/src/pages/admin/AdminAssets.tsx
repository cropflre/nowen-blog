import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Copy, Image, Link2, Pencil, ScanSearch, Trash2, Upload, X } from 'lucide-react';
import { api } from '../../lib/api';
import type { AssetReferencesResult, AssetView } from '../../types';
import { ImageUploadDialog } from '../../components/admin/ImageUploadDialog';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const REFERENCE_LABEL = {
  post_cover: '文章封面',
  post_content: '文章正文',
  site_setting: '系统设置',
  version: '历史版本',
  autosave: '自动草稿',
} as const;

export function AdminAssets() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editFilename, setEditFilename] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [referenceResult, setReferenceResult] = useState<AssetReferencesResult | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pageSize = 20;
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'assets', { page }],
    queryFn: () => api.listAssets({ page, pageSize }),
  });
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'assets'] });
  };

  const inspectReferences = async (asset: AssetView, deleteWhenUnused = false) => {
    setCheckingId(asset.id);
    setUploadError(null);
    try {
      const result = await api.getAssetReferences(asset.id);
      if (deleteWhenUnused && result.count === 0) {
        if (!confirm(`确定删除「${asset.filename || asset.storageKey}」吗？该操作不可恢复。`)) return;
        await api.deleteAsset(asset.id);
        await refresh();
        return;
      }
      setReferenceResult(result);
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : '引用检测失败');
    } finally {
      setCheckingId(null);
    }
  };

  const forceDelete = async () => {
    if (!referenceResult || deleting) return;
    if (!confirm(`该图片仍有 ${referenceResult.count} 处引用。强制删除会导致这些位置图片失效，确定继续吗？`)) return;
    setDeleting(true);
    try {
      await api.deleteAsset(referenceResult.asset.id, true);
      setReferenceResult(null);
      await refresh();
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = async (asset: AssetView) => {
    try {
      await api.updateAsset(asset.id, {
        alt: editAlt.trim() || null,
        filename: editFilename.trim() || null,
      });
      setEditingId(null);
      await refresh();
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : '更新失败');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      window.setTimeout(() => setCopySuccess(null), 1800);
    } catch {
      setUploadError('复制失败');
    }
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">媒体库</h1>
          <p className="mt-2 text-sm text-muted">上传前压缩裁剪，删除前检测文章、设置、版本和草稿引用。</p>
        </div>
        <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
          <Upload className="h-4 w-4" />上传图片
        </button>
      </header>

      {uploadError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)} aria-label="关闭"><X className="h-4 w-4" /></button>
        </div>
      )}
      {copySuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <Check className="h-4 w-4" />{copySuccess}
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-muted">加载中…</div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">加载失败：{error instanceof Error ? error.message : '未知错误'}</div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line py-16 text-muted">
          <Image className="mb-3 h-12 w-12 opacity-50" />
          <p>暂无媒体资源</p>
          <button type="button" onClick={() => setUploadOpen(true)} className="mt-3 text-sm text-brand hover:underline">上传第一张图片</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {data!.items.map((asset) => (
            <article key={asset.id} className="relative overflow-hidden rounded-card border border-line bg-surface transition hover:border-brand/50">
              <div className="aspect-square overflow-hidden bg-black/10">
                <img src={asset.url} alt={asset.alt || asset.filename || '图片'} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="space-y-2 p-3">
                <p className="truncate text-sm font-medium" title={asset.filename || asset.storageKey}>{asset.filename || asset.storageKey}</p>
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted">
                  <span>{asset.mimeType.replace('image/', '').toUpperCase()}</span>
                  <span>{formatSize(asset.size)}</span>
                  {asset.width && asset.height && <span>{asset.width}×{asset.height}</span>}
                </div>
                <p className="text-xs text-muted">{formatDate(asset.createdAt)}</p>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button type="button" onClick={() => void copyToClipboard(asset.url, 'URL 已复制')} className="inline-flex items-center justify-center gap-1 rounded-lg border border-line px-2 py-1.5 text-xs hover:border-brand/60"><Copy className="h-3 w-3" />URL</button>
                  <button type="button" onClick={() => void copyToClipboard(`![${asset.alt || ''}](${asset.url})`, 'Markdown 已复制')} className="inline-flex items-center justify-center gap-1 rounded-lg border border-line px-2 py-1.5 text-xs hover:border-brand/60"><Link2 className="h-3 w-3" />Markdown</button>
                  <button type="button" onClick={() => void inspectReferences(asset)} disabled={checkingId === asset.id} className="inline-flex items-center justify-center gap-1 rounded-lg border border-line px-2 py-1.5 text-xs hover:border-brand/60 disabled:opacity-40"><ScanSearch className="h-3 w-3" />引用</button>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => { setEditingId(asset.id); setEditAlt(asset.alt || ''); setEditFilename(asset.filename || ''); }} className="flex-1 rounded-lg border border-line p-1.5 text-muted hover:border-brand/60 hover:text-fg" title="编辑"><Pencil className="mx-auto h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => void inspectReferences(asset, true)} disabled={checkingId === asset.id} className="flex-1 rounded-lg border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-40" title="删除"><Trash2 className="mx-auto h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>

              {editingId === asset.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg/95 p-4 backdrop-blur">
                  <div className="w-full space-y-3">
                    <h3 className="font-semibold">编辑图片信息</h3>
                    <label className="block text-xs text-muted">Alt 文本<input value={editAlt} onChange={(event) => setEditAlt(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg" placeholder="描述图片内容" /></label>
                    <label className="block text-xs text-muted">显示文件名<input value={editFilename} onChange={(event) => setEditFilename(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg" /></label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void handleEdit(asset)} className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm text-white">保存</button>
                      <button type="button" onClick={() => setEditingId(null)} className="flex-1 rounded-lg border border-line px-3 py-2 text-sm">取消</button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="媒体库分页" className="flex items-center justify-center gap-3 text-sm">
          <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="rounded-lg border border-line px-3 py-2 disabled:opacity-40">上一页</button>
          <span className="text-muted">第 {page} / {totalPages} 页（共 {total} 项）</span>
          <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} className="rounded-lg border border-line px-3 py-2 disabled:opacity-40">下一页</button>
        </nav>
      )}

      <ImageUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          setPage(1);
          void refresh();
        }}
      />

      {referenceResult && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" onMouseDown={() => !deleting && setReferenceResult(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-bg p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-lg font-semibold">图片引用检测</h2><p className="mt-1 text-sm text-muted">{referenceResult.asset.filename || referenceResult.asset.storageKey}</p></div>
              <button type="button" disabled={deleting} onClick={() => setReferenceResult(null)} className="rounded-lg p-2 text-muted hover:bg-surface"><X className="h-5 w-5" /></button>
            </div>
            {referenceResult.count === 0 ? (
              <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">未检测到引用，可以安全删除。</div>
            ) : (
              <>
                <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">检测到 {referenceResult.count} 处引用。强制删除后，下列位置将出现失效图片。</div>
                <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                  {referenceResult.references.map((reference, index) => (
                    <div key={`${reference.type}-${reference.id}-${reference.field}-${index}`} className="flex items-start justify-between gap-3 rounded-lg border border-line p-3 text-sm">
                      <div><p className="font-medium text-fg">{reference.title}</p><p className="mt-1 text-xs text-muted">{reference.field}</p></div>
                      <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-muted">{REFERENCE_LABEL[reference.type]}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={deleting} onClick={() => setReferenceResult(null)} className="rounded-lg border border-line px-4 py-2 text-sm">关闭</button>
              <button type="button" disabled={deleting} onClick={() => void forceDelete()} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{deleting ? '删除中…' : referenceResult.count > 0 ? '强制删除' : '删除图片'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
