import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Loader2 } from 'lucide-react';
import { api } from '../api';
import { toastEvent } from './CyberToast';

interface ImageUploaderProps {
  onUpload: (markdown: string) => void;
  className?: string;
}

export default function ImageUploader({ onUpload, className = '' }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toastEvent.emit('ERROR: Only image files are allowed');
      return;
    }

    // 验证文件大小（最大 10MB）
    if (file.size > 10 * 1024 * 1024) {
      toastEvent.emit('ERROR: File too large (max 10MB)');
      return;
    }

    setIsUploading(true);
    try {
      const result = await api.uploadImage(file);
      onUpload(result.markdown);
      toastEvent.emit(`UPLOAD_COMPLETE: ${file.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toastEvent.emit(`ERROR: ${message}`);
    } finally {
      setIsUploading(false);
    }
  }, [onUpload]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  }, [handleUpload]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          handleUpload(file);
          break;
        }
      }
    }
  }, [handleUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  }, [handleUpload]);

  return (
    <div
      className={`relative ${className}`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* 拖拽区域 */}
      <motion.div
        animate={{
          borderColor: isDragging ? 'rgb(16, 185, 129)' : 'rgb(63, 63, 70)',
          backgroundColor: isDragging ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
        }}
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-sm text-zinc-400 font-mono">UPLOADING...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <Upload className="w-6 h-6 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-300">
                Drop image here, paste, or click to upload
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Supports: JPG, PNG, GIF, WebP (max 10MB)
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}