import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Image, Loader2, Upload, X } from 'lucide-react';
import { api } from '../../lib/api';
import type { AssetView } from '../../types';
import { ImageUploadDialog } from './ImageUploadDialog';

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: AssetView) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaPicker({ open, onClose, onSelect }: MediaPickerProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'assets', 'picker', { page }],
    queryFn: () => api.listAssets({ page, pageSize }),
    enabled: open,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={onClose}>
        <div
          className="max-h-[86vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-line bg-bg p-5 shadow-2xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">选择图片</h2>
              <p className="mt-1 text-xs text-muted">从媒体库选择，或上传前进行压缩和裁剪。</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-fg" aria-label="关闭">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="mb-5 flex items-center gap-3">
            <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
              <Upload className="h-4 w-4" />上传并处理图片
            </button>
          </div>

          {uploadError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />{uploadError}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted"><Loader2 className="mr-2 h-5 w-5 animate-spin" />加载中…</div>
          ) : error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">加载失败：{error instanceof Error ? error.message : '未知错误'}</div>
          ) : (data?.items.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line py-16 text-muted">
              <Image className="mb-3 h-12 w-12 opacity-50" />
              <p>暂无图片</p>
              <button type="button" onClick={() => setUploadOpen(true)} className="mt-3 text-sm text-brand hover:underline">上传第一张图片</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {data!.items.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    onSelect(asset);
                    onClose();
                  }}
                  className="group overflow-hidden rounded-xl border border-line bg-surface text-left transition hover:-translate-y-0.5 hover:border-brand/60"
                >
                  <div className="aspect-square overflow-hidden bg-black/10">
                    <img src={asset.url} alt={asset.alt || asset.filename || '图片'} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
                  </div>
                  <div className="space-y-1 p-2.5">
                    <p className="truncate text-xs font-medium" title={asset.filename || asset.storageKey}>{asset.filename || asset.storageKey}</p>
                    <p className="text-xs text-muted">{formatSize(asset.size)}{asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav aria-label="图片选择器分页" className="mt-5 flex items-center justify-center gap-3 text-sm">
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="rounded-lg border border-line px-3 py-2 disabled:opacity-40">上一页</button>
              <span className="text-muted">第 {page} / {totalPages} 页</span>
              <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} className="rounded-lg border border-line px-3 py-2 disabled:opacity-40">下一页</button>
            </nav>
          )}
        </div>
      </div>

      <ImageUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(asset) => {
          setUploadError(null);
          void queryClient.invalidateQueries({ queryKey: ['admin', 'assets'] });
          onSelect(asset);
          setUploadOpen(false);
          onClose();
        }}
      />
    </>
  );
}
