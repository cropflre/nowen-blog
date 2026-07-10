import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Crop, ImagePlus, Loader2, Upload, X } from 'lucide-react';
import { api } from '../../lib/api';
import type { AssetView } from '../../types';

type CropRatio = 'original' | '1:1' | '4:3' | '16:9';
type OutputFormat = 'original' | 'image/webp' | 'image/jpeg' | 'image/png';

const RATIO_VALUE: Record<Exclude<CropRatio, 'original'>, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
};

const ALLOWED_OUTPUT = new Set(['image/webp', 'image/jpeg', 'image/png']);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function extensionFor(mime: string): string {
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/png') return 'png';
  return 'jpg';
}

function outputName(name: string, mime: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'image';
  return `${base}-${Date.now()}.${extensionFor(mime)}`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('无法读取图片'));
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('浏览器无法导出该图片格式'))),
      mime,
      quality,
    );
  });
}

export function ImageUploadDialog({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (asset: AssetView) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [cropRatio, setCropRatio] = useState<CropRatio>('original');
  const [focusX, setFocusX] = useState(50);
  const [focusY, setFocusY] = useState(50);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [quality, setQuality] = useState(82);
  const [format, setFormat] = useState<OutputFormat>('image/webp');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGif = file?.type === 'image/gif';
  const previewAspect = useMemo(() => {
    if (cropRatio === 'original') return dimensions ? dimensions.width / dimensions.height : 16 / 9;
    return RATIO_VALUE[cropRatio];
  }, [cropRatio, dimensions]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !uploading) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open, uploading]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl('');
    setDimensions(null);
    setCropRatio('original');
    setFocusX(50);
    setFocusY(50);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    if (uploading) return;
    reset();
    onClose();
  };

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    if (!next) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(next.type)) {
      setError('仅支持 PNG、JPEG、WebP 和 GIF');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(next);
    setFile(next);
    setPreviewUrl(url);
    setError(null);
    setCropRatio('original');
    setFormat(next.type === 'image/gif' ? 'original' : 'image/webp');
    try {
      const image = await loadImage(url);
      setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法读取图片');
      setDimensions(null);
    }
  };

  const createProcessedFile = async (): Promise<File> => {
    if (!file || !previewUrl) throw new Error('请先选择图片');
    const noTransform =
      format === 'original' &&
      cropRatio === 'original' &&
      (!dimensions || dimensions.width <= maxWidth);
    if (isGif || noTransform) return file;

    const image = await loadImage(previewUrl);
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    let sourceX = 0;
    let sourceY = 0;
    let sourceCropWidth = sourceWidth;
    let sourceCropHeight = sourceHeight;

    if (cropRatio !== 'original') {
      const ratio = RATIO_VALUE[cropRatio];
      if (sourceWidth / sourceHeight > ratio) {
        sourceCropWidth = sourceHeight * ratio;
        sourceX = (sourceWidth - sourceCropWidth) * (focusX / 100);
      } else {
        sourceCropHeight = sourceWidth / ratio;
        sourceY = (sourceHeight - sourceCropHeight) * (focusY / 100);
      }
    }

    const targetWidth = Math.max(1, Math.round(Math.min(sourceCropWidth, maxWidth)));
    const targetHeight = Math.max(1, Math.round(targetWidth * (sourceCropHeight / sourceCropWidth)));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('浏览器不支持图片处理');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    const requestedMime = format === 'original' ? file.type : format;
    if (requestedMime === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, targetWidth, targetHeight);
    }
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceCropWidth,
      sourceCropHeight,
      0,
      0,
      targetWidth,
      targetHeight,
    );

    const blob = await canvasBlob(canvas, requestedMime, quality / 100);
    const actualMime = ALLOWED_OUTPUT.has(blob.type) ? blob.type : requestedMime;
    return new File([blob], outputName(file.name, actualMime), {
      type: actualMime,
      lastModified: Date.now(),
    });
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const processed = await createProcessedFile();
      const asset = await api.uploadAsset(processed);
      onUploaded(asset);
      reset();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onMouseDown={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="图片压缩与裁剪"
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-line bg-bg shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Crop className="h-5 w-5 text-brand" />图片压缩与裁剪</h2>
            <p className="mt-1 text-xs text-muted">处理过程仅在浏览器中完成，上传前可调整比例、焦点、尺寸和质量。</p>
          </div>
          <button type="button" onClick={close} disabled={uploading} className="rounded-lg p-2 text-muted hover:bg-surface hover:text-fg disabled:opacity-40" aria-label="关闭"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.25fr)_360px]">
          <section>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => void chooseFile(event)} className="hidden" />
            {!file ? (
              <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-[420px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface text-muted transition hover:border-brand/60 hover:text-fg">
                <ImagePlus className="mb-4 h-12 w-12 text-brand" />
                <span className="font-medium">选择要上传的图片</span>
                <span className="mt-2 text-xs">PNG / JPEG / WebP / GIF</span>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-line bg-black/80 p-4">
                  <div className="max-h-[65vh] w-full overflow-hidden rounded-xl" style={{ aspectRatio: String(previewAspect) }}>
                    <img src={previewUrl} alt="裁剪预览" className="h-full w-full object-cover" style={{ objectPosition: `${focusX}% ${focusY}%` }} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
                  <span>{file.name} · {formatBytes(file.size)}{dimensions ? ` · ${dimensions.width}×${dimensions.height}` : ''}</span>
                  <button type="button" onClick={() => inputRef.current?.click()} className="text-brand hover:underline">重新选择</button>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <section className="rounded-card border border-line bg-surface p-4">
              <h3 className="text-sm font-semibold">裁剪比例</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(['original', '1:1', '4:3', '16:9'] as CropRatio[]).map((value) => (
                  <button key={value} type="button" disabled={!file || isGif} onClick={() => setCropRatio(value)} className={`rounded-lg border px-3 py-2 text-sm transition disabled:opacity-40 ${cropRatio === value ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted hover:text-fg'}`}>
                    {value === 'original' ? '原始比例' : value}
                  </button>
                ))}
              </div>
              {isGif && <p className="mt-3 text-xs text-amber-400">GIF 将保留原动画，不进行裁剪和压缩。</p>}
            </section>

            {cropRatio !== 'original' && !isGif && (
              <section className="rounded-card border border-line bg-surface p-4">
                <h3 className="text-sm font-semibold">裁剪焦点</h3>
                <label className="mt-3 block text-xs text-muted">水平位置 {focusX}%<input type="range" min={0} max={100} value={focusX} onChange={(event) => setFocusX(Number(event.target.value))} className="mt-2 w-full" /></label>
                <label className="mt-3 block text-xs text-muted">垂直位置 {focusY}%<input type="range" min={0} max={100} value={focusY} onChange={(event) => setFocusY(Number(event.target.value))} className="mt-2 w-full" /></label>
              </section>
            )}

            <section className="rounded-card border border-line bg-surface p-4">
              <h3 className="text-sm font-semibold">输出设置</h3>
              <label className="mt-3 block text-xs text-muted">格式<select disabled={!file || isGif} value={format} onChange={(event) => setFormat(event.target.value as OutputFormat)} className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg disabled:opacity-40"><option value="image/webp">WebP（推荐）</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="original">保持原格式</option></select></label>
              <label className="mt-3 block text-xs text-muted">最大宽度<select disabled={!file || isGif} value={maxWidth} onChange={(event) => setMaxWidth(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg disabled:opacity-40"><option value={1280}>1280 px</option><option value={1920}>1920 px</option><option value={2560}>2560 px</option><option value={4096}>保持大图（最高 4096）</option></select></label>
              <label className="mt-3 block text-xs text-muted">质量 {quality}%<input disabled={!file || isGif || format === 'image/png'} type="range" min={45} max={95} value={quality} onChange={(event) => setQuality(Number(event.target.value))} className="mt-2 w-full disabled:opacity-40" /></label>
            </section>

            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

            <button type="button" disabled={!file || uploading} onClick={() => void upload()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? '处理中并上传…' : '处理并上传'}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
