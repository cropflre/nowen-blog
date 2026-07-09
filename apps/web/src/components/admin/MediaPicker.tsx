import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { AssetView } from '../../types';
import { Image, Upload, X, AlertCircle, Loader2 } from 'lucide-react';

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: AssetView) => void;
}

export function MediaPicker({ open, onClose, onSelect }: MediaPickerProps) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'assets', 'picker', { page }],
    queryFn: () => api.listAssets({ page, pageSize }),
    enabled: open, // 只在打开时查询
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
      qc.invalidateQueries({ queryKey: ['admin', 'assets', 'picker'] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 max-h-[80vh] w-full max-w-4xl overflow-auto rounded-xl border border-line bg-background p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">选择图片</h2>
          <button onClick={onClose} className="rounded-lg p-1 transition hover:bg-surface">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Upload */}
        <div className="mb-4 flex items-center gap-3">
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
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                上传图片
              </>
            )}
          </button>
        </div>

        {/* Upload Error */}
        {uploadError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {uploadError}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            加载中...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            加载失败: {error instanceof Error ? error.message : '未知错误'}
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && (!data?.items || data.items.length === 0) && (
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <Image className="mb-3 h-12 w-12 opacity-50" />
            <p>暂无图片</p>
            <p className="mt-1 text-sm">点击「上传图片」添加图片</p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !error && data?.items && data.items.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {data.items.map((asset) => (
              <button
                key={asset.id}
                onClick={() => {
                  onSelect(asset);
                  onClose();
                }}
                className="group relative overflow-hidden rounded-lg border border-line bg-surface transition hover:border-brand/50"
              >
                <div className="aspect-square overflow-hidden bg-zinc-900/50">
                  <img
                    src={asset.url}
                    alt={asset.alt || asset.filename || '图片'}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-0.5 p-2 text-left">
                  <div className="truncate text-xs font-medium" title={asset.filename || asset.storageKey}>
                    {asset.filename || asset.storageKey}
                  </div>
                  <div className="text-xs text-muted">
                    {formatSize(asset.size)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border border-line px-3 py-1.5 text-sm disabled:opacity-50"
            >
              上一页
            </button>
            <span className="text-sm text-muted">
              第 {page} / {totalPages} 页
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
    </div>
  );
}
