import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Eye, Code, Tag, Clock, Zap, Cpu, Image as ImageIcon, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { debounce } from 'lodash-es';
import { api } from '../api';
import type { Post, PostRequest } from '../types';
import ImageUploader from '../components/ImageUploader';
import { toastEvent } from '../components/CyberToast';

interface ArticleEditorProps {
  postId?: number;
  onBack: () => void;
}

export default function ArticleEditor({ postId, onBack }: ArticleEditorProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [previewContent, setPreviewContent] = useState(''); // 防抖后的预览内容
  const [isCompiling, setIsCompiling] = useState(false);
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [isInlineUploading, setIsInlineUploading] = useState(false);
  const [isTextareaDragging, setIsTextareaDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 防抖同步预览层：停顿 200ms 后启动 AST 编译
  const debouncedSync = useRef(
    debounce((text: string) => {
      setPreviewContent(text);
      setIsCompiling(false);
    }, 200)
  ).current;

  // 加载现有文章
  useEffect(() => {
    if (postId) {
      api.adminGetPost(postId).then((post: Post) => {
        setTitle(post.title);
        setSlug(post.slug);
        setSummary(post.summary);
        setContent(post.content);
        setTags(post.tags);
        setStatus(post.status);
      });
    }
  }, [postId]);

  // 自动生成 slug
  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    if (!postId) {
      setSlug(value.toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, ''));
    }
  }, [postId]);

  // 计算阅读时间
  const readTime = Math.max(1, Math.ceil(content.length / 200));

  // 保存文章
  const handleSave = async () => {
    if (!title || !slug) {
      alert('标题和 slug 不能为空');
      return;
    }

    setSaving(true);
    try {
      const data: PostRequest = {
        title,
        slug,
        summary,
        content,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        status,
      };

      if (postId) {
        await api.updatePost(postId, data);
      } else {
        await api.createPost(data);
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('Save failed:', error);
      alert('保存失败: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // 快捷键保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, slug, summary, content, tags, status]);

  // 插入图片 Markdown（从 ImageUploader 面板）
  const handleImageUpload = useCallback((markdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + '\n' + markdown + '\n' + content.substring(end);
    setContent(newContent);
    setShowImageUploader(false);

    // 重新设置光标位置
    setTimeout(() => {
      textarea.focus();
      const newPos = start + markdown.length + 2;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [content]);

  // === 内联图片上传管道（直觉级 Ctrl+V / Drag & Drop） ===
  const inlineUploadImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toastEvent.emit('ERROR: 仅支持图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toastEvent.emit('ERROR: 文件过大 (最大 10MB)');
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;

    // 在光标处插入极客占位符
    const placeholder = `![UPLOADING_SYS_IMG...]()\n`;
    const before = content.substring(0, startPos);
    const after = content.substring(endPos);
    const withPlaceholder = before + placeholder + after;
    setContent(withPlaceholder);
    setIsInlineUploading(true);

    // 移动光标到占位符之后
    setTimeout(() => {
      textarea.focus();
      const cursorPos = startPos + placeholder.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);

    try {
      const result = await api.uploadImage(file);
      const imageMark = result.markdown || `![${result.original || file.name}](${result.url})`;

      setContent(prev => prev.replace(placeholder, imageMark + '\n'));
      debouncedSync(content.replace(placeholder, imageMark + '\n'));
      toastEvent.emit(`UPLOAD_COMPLETE: ${file.name}`);
    } catch (err) {
      // 上传失败，移除占位符
      setContent(prev => prev.replace(placeholder, ''));
      const message = err instanceof Error ? err.message : 'Upload failed';
      toastEvent.emit(`ERROR: ${message}`);
    } finally {
      setIsInlineUploading(false);
    }
  }, [content, debouncedSync]);

  // textarea 粘贴拦截
  const handleTextareaPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          inlineUploadImage(file);
        }
        break;
      }
    }
  }, [inlineUploadImage]);

  // textarea 拖拽拦截
  const handleTextareaDragOver = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsTextareaDragging(true);
    }
  }, []);

  const handleTextareaDragLeave = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTextareaDragging(false);
  }, []);

  const handleTextareaDrop = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTextareaDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        inlineUploadImage(file);
      } else {
        toastEvent.emit('ERROR: 仅支持图片文件');
      }
    }
  }, [inlineUploadImage]);

  return (
    <div className="h-screen bg-[#050505] text-zinc-300 flex flex-col overflow-hidden">
      {/* 编辑器头部 */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-xs font-mono">BACK</span>
          </motion.button>
          
          <div className="w-px h-6 bg-zinc-800" />
          
          <input
            type="text"
            placeholder="// 输入文章标题..."
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="bg-transparent text-white font-medium text-sm focus:outline-none w-64 placeholder-zinc-600"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* 内联上传状态灯 */}
          {isInlineUploading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 text-xs font-mono"
            >
              <Upload size={12} className="text-amber-400 animate-pulse" />
              <span className="text-amber-400 animate-pulse">UP_LINKING...</span>
            </motion.div>
          )}

          {/* 编译状态指示 */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <Cpu size={12} className={isCompiling ? "text-amber-400 animate-spin" : "text-zinc-600"} />
            <span>{isCompiling ? "COMPILING..." : "READY"}</span>
          </div>

          {/* 状态指示 */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <Clock size={12} />
            <span>{readTime} min read</span>
          </div>

          {/* 状态切换 */}
          <div className="bg-zinc-900 border border-zinc-800 p-0.5 rounded-md flex gap-0.5 text-xs">
            <button
              onClick={() => setStatus('draft')}
              className={`px-3 py-1.5 rounded transition-all ${
                status === 'draft' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              草稿
            </button>
            <button
              onClick={() => setStatus('published')}
              className={`px-3 py-1.5 rounded transition-all ${
                status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              发布
            </button>
          </div>

          {/* 预览切换 */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowPreview(!showPreview)}
            className={`p-2 rounded-lg border transition-all ${
              showPreview 
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {showPreview ? <Code size={16} /> : <Eye size={16} />}
          </motion.button>

          {/* 图片上传 */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowImageUploader(!showImageUploader)}
            className={`p-2 rounded-lg border transition-all ${
              showImageUploader 
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon size={16} />
          </motion.button>

          {/* 保存按钮 */}
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 0 15px rgba(16, 185, 129, 0.2)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg text-xs font-mono font-semibold tracking-wider transition-all disabled:opacity-50"
          >
            {saving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full"
              />
            ) : (
              <Save size={14} />
            )}
            <span>{saving ? 'SAVING...' : 'EXECUTE_SAVE'}</span>
          </motion.button>
        </div>
      </div>

      {/* 元信息栏 */}
      <div className="h-10 border-b border-zinc-800/50 flex items-center px-4 gap-6 bg-zinc-950/50">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="text-zinc-600">slug:</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="bg-transparent text-zinc-400 focus:outline-none w-48 font-mono"
            placeholder="auto-generated-slug"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Tag size={12} />
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="bg-transparent text-zinc-400 focus:outline-none w-64 font-mono"
            placeholder="tag1, tag2, tag3"
          />
        </div>
        {lastSaved && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1.5 text-xs text-emerald-500/70 font-mono"
          >
            <Zap size={12} />
            <span>SYNCED: {lastSaved.toLocaleTimeString('zh-CN')}</span>
          </motion.div>
        )}
      </div>

      {/* 主编辑区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：源码编写区 */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} h-full border-r border-zinc-800/50 transition-all duration-300`}>
          <div className="h-full p-6 bg-[#030303]">
            {/* 摘要输入 */}
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="// 文章摘要（可选）..."
              className="w-full h-16 bg-transparent font-mono text-xs leading-relaxed text-zinc-500 focus:outline-none resize-none placeholder-zinc-700 mb-4 border-b border-zinc-800/30 pb-4"
            />

            {/* 图片上传区域 */}
            {showImageUploader && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <ImageUploader onUpload={handleImageUpload} />
              </motion.div>
            )}
            
            {/* 内容编辑（支持 Ctrl+V 粘贴图片 + 拖拽图片） */}
            <div className="relative w-full h-[calc(100%-5rem)]">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  const val = e.target.value;
                  setContent(val);
                  setIsCompiling(true); // 亮起编译状态灯
                  debouncedSync(val);
                }}
                onPaste={handleTextareaPaste}
                onDragOver={handleTextareaDragOver}
                onDragLeave={handleTextareaDragLeave}
                onDrop={handleTextareaDrop}
                placeholder={`# 开始你的 Markdown 极客构建...\n\n## 功能特性\n\n- 支持完整的 Markdown 语法\n- 实时预览\n- 自动保存\n- Ctrl+V / 拖拽 直接粘贴图片\n\n> 提示: 使用 Ctrl+S 快速保存`}
                className="w-full h-full bg-transparent font-mono text-sm leading-relaxed text-zinc-300 focus:outline-none resize-none placeholder-zinc-700"
                autoFocus
              />

              {/* 拖拽悬浮遮罩 */}
              {isTextareaDragging && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-emerald-500/5 border-2 border-dashed border-emerald-500/40 rounded-lg pointer-events-none z-10"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-emerald-400 animate-bounce" />
                    <span className="text-xs font-mono text-emerald-400">DROP TO UPLOAD</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：实时预览区 */}
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-1/2 h-full overflow-y-auto bg-[#050505] custom-scrollbar"
          >
            <div className="p-8">
              {title && (
                <h1 className="text-3xl font-bold text-white mb-4">{title}</h1>
              )}
              {summary && (
                <p className="text-zinc-400 mb-6 text-sm">{summary}</p>
              )}
              <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-200 prose-p:text-zinc-400 prose-a:text-emerald-400 prose-code:text-emerald-300 prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-zinc-800">
                {previewContent ? (
                  <ReactMarkdown>{previewContent}</ReactMarkdown>
                ) : (
                  <div className="text-center py-20 text-zinc-600">
                    <p className="font-mono text-xs">// 编译预览层空载</p>
                    <p className="font-mono text-xs mt-2">开始编写后此处将实时渲染</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="h-6 border-t border-zinc-800/50 flex items-center justify-between px-4 bg-zinc-950/50 text-[10px] text-zinc-600 font-mono">
        <div className="flex items-center gap-4">
          <span>MODE: <span className="text-zinc-400">{showPreview ? 'SPLIT' : 'EDITOR'}</span></span>
          <span>STATUS: <span className={status === 'published' ? 'text-emerald-500' : 'text-amber-500'}>{status.toUpperCase()}</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span>CHARS: <span className="text-zinc-400">{content.length}</span></span>
          <span>LINES: <span className="text-zinc-400">{content.split('\n').length}</span></span>
        </div>
      </div>
    </div>
  );
}
