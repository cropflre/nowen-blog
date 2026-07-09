import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { AssetView } from '../../types';
import { Image, Upload, Copy, Pencil, Trash2, AlertCircle, Check } from 'lucide-react';

export function AdminAssets() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editFilename, setEditFilename] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'assets', { page }],
    queryFn: () => api.listAssets({ page, pageSize }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      await api.uploadAsset(file);
      qc.invalidateQueries({ queryKey: ['admin', 'assets'] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (asset: AssetView) => {
    if (!confirm(`确定要删除「${asset.filename || asset.storageKey}」吗？此操作不可恢复。`)) return;

    try {
      await api.deleteAsset(asset.id);
      qc.invalidateQueries({ queryKey: ['admin', 'assets'] });
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleEdit = async (asset: AssetView) => {
    try {
      await api.updateAsset(asset.id, {
        alt: editAlt || null,
        filename: editFilename || null,
      });
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['admin', 'assets'] });
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失败');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch {
      alert('复制失败');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">媒体库</h1>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand/90 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploading ? '上传中...' : '上传图片'}
          </button>
        </div>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {uploadError}
        </div>
      )}

      {/* Copy Success */}
      {copySuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <Check className="h-4 w-4 shrink-0" />
          {copySuccess}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted">
          加载中...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          加载失败: {error instanceof Error ? error.message : '未知错误'}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!data?.items || data.items.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <Image className="mb-3 h-12 w-12 opacity-50" />
          <p>暂无媒体资源</p>
          <p className="mt-1 text-sm">点击「上传图片」添加图片</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && data?.items && data.items.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {data.items.map((asset) => (
            <div
              key={asset.id}
              className="group relative overflow-hidden rounded-lg border border-line bg-surface transition hover:border-brand/50"
            >
              {/* Image Preview */}
              <div className="aspect-square overflow-hidden bg-zinc-900/50">
                <img
                  src={asset.url}
                  alt={asset.alt || asset.filename || '图片'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Info Overlay */}
              <div className="space-y-1 p-3">
                <div className="truncate text-sm font-medium" title={asset.filename || asset.storageKey}>
                  {asset.filename || asset.storageKey}
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{asset.mimeType}</span>
                  <span>{formatSize(asset.size)}</span>
                </div>
                <div className="text-xs text-muted">
                  {formatDate(asset.createdAt)}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pt-2">
                  <button
                    onClick={() => copyToClipboard(asset.url, 'URL 已复制')}
                    className="flex-1 rounded border border-line px-2 py-1 text-xs transition hover:border-brand/60"
                    title="复制 URL"
                  >
                    复制 URL
                  </button>
                  <button
                    onClick={() => copyToClipboard(`![${asset.alt || ''}](${asset.url})`, 'Markdown 已复制')}
                    className="flex-1 rounded border border-line px-2 py-1 text-xs transition hover:border-brand/60"
                    title="复制 Markdown"
                  >
                    MD
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(asset.id);
                      setEditAlt(asset.alt || '');
                      setEditFilename(asset.filename || '');
                    }}
                    className="rounded border border-line p-1 transition hover:border-brand/60"
                    title="编辑"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(asset)}
                    className="rounded border border-line p-1 text-red-400 transition hover:border-red-500/60"
                    title="删除"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Edit Modal */}
              {editingId === asset.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/95 p-4">
                  <div className="w-full space-y-3">
                    <h3 className="text-sm font-semibold">编辑信息</h3>
                    <div className="space-y-2">
                      <label className="block text-xs text-muted">Alt 文本</label>
                      <input
                        type="text"
                        value={editAlt}
                        onChange={(e) => setEditAlt(e.target.value)}
                        className="w-full rounded border border-line bg-background px-3 py-1.5 text-sm"
                        placeholder="图片描述"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs text-muted">文件名</label>
                      <input
                        type="text"
                        value={editFilename}
                        onChange={(e) => setEditFilename(e.target.value)}
                        className="w-full rounded border border-line bg-background px-3 py-1.5 text-sm"
                        placeholder="显示名称"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(asset)}
                        className="flex-1 rounded bg-brand px-3 py-1.5 text-sm text-white"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 rounded border border-line px-3 py-1.5 text-sm"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border border-line px-3 py-1.5 text-sm disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-muted">
            第 {page} / {totalPages} 页（共 {total} 项）
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
