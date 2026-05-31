import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Eye, Code, Tag, Image as ImageIcon, Upload, FileText, FolderOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { debounce } from 'lodash-es';
import { api } from '../api';
import type { Post, PostRequest, Content, ProjectInfo } from '../types';
import ImageUploader from '../components/ImageUploader';
import { toastEvent } from '../components/CyberToast';

interface ArticleEditorProps {
  postId?: number;
  onBack: () => void;
  contentType?: 'blog' | 'doc';
}

export default function ArticleEditor({ postId, onBack, contentType = 'blog' }: ArticleEditorProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [isTextareaDragging, setIsTextareaDragging] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 项目文档相关状态
  const [type, setType] = useState<'blog' | 'doc'>(contentType);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [order, setOrder] = useState<number>(0);

  // 防抖同步预览层
  const debouncedSync = useRef(
    debounce((text: string) => {
      setPreviewContent(text);
      setIsCompiling(false);
    }, 200)
  ).current;

  // 加载项目列表
  useEffect(() => {
    if (type === 'doc') {
      api.getProjectsList().then((data) => {
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0].project_name);
          setGithubUrl(data[0].github_url || '');
        }
      }).catch(console.error);
    }
  }, [type]);

  // 加载现有内容
  useEffect(() => {
    if (postId) {
      if (type === 'blog') {
        api.adminGetPost(postId).then((post: Post) => {
          setTitle(post.title);
          setSlug(post.slug);
          setSummary(post.summary);
          setContent(post.content);
          setTags(post.tags);
          setStatus(post.status);
        });
      } else {
        // 对于 doc 类型，需要从 contents 列表中找到
        api.getContents({ type: 'doc', pageSize: 100 }).then((response) => {
          const doc = response.data.find(c => c.id === postId);
          if (doc) {
            setTitle(doc.title);
            setSlug(doc.slug);
            setSummary(doc.summary);
            setContent(doc.content);
            setTags(doc.tags);
            setStatus(doc.status);
            setSelectedProject(doc.project_name);
            setGithubUrl(doc.github_url);
            setOrder(doc.order);
          }
        });
      }
    }
  }, [postId, type]);

  // 自动生成 slug
  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    if (!postId) {
      setSlug(value.toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, ''));
    }
  }, [postId]);

  // 处理项目选择
  const handleProjectChange = (projectName: string) => {
    setSelectedProject(projectName);
    const project = projects.find(p => p.project_name === projectName);
    if (project) {
      setGithubUrl(project.github_url || '');
    }
  };

  // 保存内容
  const handleSave = async () => {
    if (!title || !slug) {
      alert(t('admin.titleRequired'));
      return;
    }

    setSaving(true);
    try {
      if (type === 'blog') {
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
      } else {
        // 项目文档
        const data: Partial<Content> = {
          type: 'doc',
          project_name: selectedProject,
          github_url: githubUrl,
          title,
          slug,
          summary,
          content,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean).join(','),
          status,
          order,
        };

        if (postId) {
          await api.adminUpdateContent(postId, data);
        } else {
          await api.adminCreateContent(data);
        }
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert(t('admin.saveFailed') + ': ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // 快捷键保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        setShowSaveConfirm(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, slug, summary, content, tags, status, selectedProject, githubUrl, order, type]);

  // 插入图片 Markdown
  const handleImageUpload = useCallback((markdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + '\n' + markdown + '\n' + content.substring(end);
    setContent(newContent);
    setShowImageUploader(false);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + markdown.length + 2;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [content]);

  // 内联图片上传
  const inlineUploadImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toastEvent.emit(t('admin.onlyImagesSupported'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toastEvent.emit(t('admin.fileTooLarge'));
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;

    const placeholder = `![UPLOADING_SYS_IMG...]()\n`;
    const before = content.substring(0, startPos);
    const after = content.substring(endPos);
    setContent(before + placeholder + after);

    try {
      const result = await api.uploadImage(file);
      setContent(prev => {
        const idx = prev.indexOf(placeholder);
        if (idx === -1) return prev;
        const b = prev.substring(0, idx);
        const a = prev.substring(idx + placeholder.length);
        const realMd = `![${file.name}](${result.url})\n`;
        return b + realMd + a;
      });
      toastEvent.emit(t('admin.imageUploaded'));
    } catch (err) {
      setContent(prev => prev.replace(placeholder, ''));
      toastEvent.emit(t('admin.uploadFailed') + ': ' + (err as Error).message);
    } finally {
      setTimeout(() => {
        textarea.focus();
      }, 0);
    }
  }, [content, t]);

  const handleTextareaPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) inlineUploadImage(file);
        return;
      }
    }
  }, [inlineUploadImage]);

  const handleTextareaDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsTextareaDragging(true);
    }
  }, []);

  const handleTextareaDragLeave = useCallback(() => {
    setIsTextareaDragging(false);
  }, []);

  const handleTextareaDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsTextareaDragging(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        inlineUploadImage(file);
      } else {
        toastEvent.emit(t('admin.onlyImagesSupported'));
      }
    }
  }, [inlineUploadImage, t]);

  return (
    <div className="h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="h-12 border-b border-[var(--color-border-surface)] flex items-center justify-between px-4 bg-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft size={16} />
          </motion.button>
          
          <div className="w-px h-6 bg-[var(--color-border-surface)]" />
          
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <Code size={12} />
            <span className="font-mono">{t('admin.editor')}</span>
          </div>

          {/* 内容类型切换 */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setType('blog')}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-mono rounded transition-all ${
                type === 'blog'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <FileText size={12} />
              {t('admin.blog')}
            </button>
            <button
              onClick={() => setType('doc')}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-mono rounded transition-all ${
                type === 'doc'
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <FolderOpen size={12} />
              {t('admin.doc')}
            </button>
          </div>
          
          {isCompiling && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono">{t('admin.compileStatus')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* 项目选择（仅文档类型显示） */}
          {type === 'doc' && (
            <>
              <select
                value={selectedProject}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              >
                <option value="">{t('admin.selectProject')}</option>
                {projects.map((project) => (
                  <option key={project.project_name} value={project.project_name}>
                    {project.project_name}
                  </option>
                ))}
              </select>

              {/* 排序 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">{t('admin.docOrder')}:</span>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                  className="w-16 bg-transparent border-b border-[var(--color-border-surface)] focus:border-[var(--color-accent)] px-1 py-0.5 text-xs text-[var(--color-text-primary)] focus:outline-none font-mono"
                />
              </div>

              <div className="w-px h-6 bg-[var(--color-border-surface)]" />
            </>
          )}

          {/* 标题输入 */}
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={t('admin.articleTitle')}
            className="w-64 bg-transparent border-b border-[var(--color-border-surface)] focus:border-[var(--color-accent)] px-2 py-1 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none transition-colors"
          />

          <div className="w-px h-6 bg-[var(--color-border-surface)]" />

          {/* Slug */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)] font-mono">{t('admin.slug')}:</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="article-slug"
              className="w-32 bg-transparent border-b border-[var(--color-border-surface)] focus:border-[var(--color-accent)] px-2 py-1 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none font-mono transition-colors"
            />
          </div>

          <div className="w-px h-6 bg-[var(--color-border-surface)]" />

          {/* 标签 */}
          <div className="flex items-center gap-2">
            <Tag size={12} className="text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2"
              className="w-32 bg-transparent border-b border-[var(--color-border-surface)] focus:border-[var(--color-accent)] px-2 py-1 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none font-mono transition-colors"
            />
          </div>

          <div className="w-px h-6 bg-[var(--color-border-surface)]" />

          {/* 状态切换 */}
          <button
            onClick={() => { if (status === 'draft') { setShowPublishConfirm(true); } else { setStatus('draft'); } }}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-all ${
              status === 'published'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            }`}
          >
            {t(`admin.${status === 'published' ? 'publishedStatus' : 'draft'}`)}
          </button>

          {/* 预览切换 */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowPreview(!showPreview)}
            className={`p-2 rounded-lg transition-colors ${
              showPreview
                ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Eye size={16} />
          </motion.button>

          {/* 图片上传 */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowImageUploader(!showImageUploader)}
            className={`p-2 rounded-lg transition-colors ${
              showImageUploader
                ? 'bg-blue-500/10 text-blue-400'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <ImageIcon size={16} />
          </motion.button>

          {/* 保存按钮 */}
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(16, 185, 129, 0.2)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowSaveConfirm(true)}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{saving ? t('admin.saving') : t('admin.save')}</span>
          </motion.button>
        </div>
      </div>

      {/* 主编辑区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：编辑区 */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} h-full bg-[var(--color-bg-primary)] border-r border-[var(--color-border-surface)] transition-all duration-300`}>
          <div className="h-full p-6 bg-[var(--color-bg-secondary)]">
            {/* 摘要输入 */}
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t('admin.articleSummary')}
              className="w-full h-16 bg-transparent font-mono text-xs leading-relaxed text-[var(--color-text-muted)] focus:outline-none resize-none placeholder-[var(--color-text-muted)] mb-4 border-b border-[var(--color-border-surface)] pb-4"
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
            
            {/* 内容编辑 */}
            <div className="relative w-full h-[calc(100%-5rem)]">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  const val = e.target.value;
                  setContent(val);
                  setIsCompiling(true);
                  debouncedSync(val);
                }}
                onPaste={handleTextareaPaste}
                onDragOver={handleTextareaDragOver}
                onDragLeave={handleTextareaDragLeave}
                onDrop={handleTextareaDrop}
                placeholder={t('admin.startMarkdown')}
                className="w-full h-full bg-transparent font-mono text-sm leading-relaxed text-[var(--color-text-primary)] focus:outline-none resize-none placeholder-[var(--color-text-muted)]"
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
                    <span className="text-xs font-mono text-emerald-400">{t('admin.dropToUpload')}</span>
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
            className="w-1/2 h-full overflow-y-auto bg-[var(--color-bg-primary)] custom-scrollbar"
          >
            <div className="p-8">
              {title && (
                <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">{title}</h1>
              )}
              {summary && (
                <p className="text-[var(--color-text-secondary)] mb-6 text-sm">{summary}</p>
              )}
              <div className="minimal-prose">
                {previewContent ? (
                  <ReactMarkdown>{previewContent}</ReactMarkdown>
                ) : (
                  <div className="text-center py-20 text-[var(--color-text-muted)]">
                    <p className="font-mono text-xs">{t('admin.compilingPreview')}</p>
                    <p className="font-mono text-xs mt-2">{t('admin.compilingPreviewDesc')}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="h-6 border-t border-[var(--color-border-surface)] flex items-center justify-between px-4 bg-[var(--color-bg-secondary)] text-[10px] text-[var(--color-text-muted)] font-mono">
        <div className="flex items-center gap-4">
          <span>{t('admin.contentType')}: <span className={type === 'blog' ? 'text-emerald-400' : 'text-blue-400'}>{t(`admin.${type}`)}</span></span>
          <span>{t('admin.mode')}: <span className="text-[var(--color-text-secondary)]">{showPreview ? t('admin.splitMode') : t('admin.editorMode')}</span></span>
          <span>{t('admin.status')}: <span className={status === 'published' ? 'text-emerald-500' : 'text-amber-500'}>{t(`admin.${status === 'published' ? 'publishedStatus' : 'draft'}`)}</span></span>
        </div>
        <div className="flex items-center gap-4">
          {type === 'doc' && selectedProject && (
            <span>{t('admin.projectName')}: <span className="text-blue-400">{selectedProject}</span></span>
          )}
          <span>{t('admin.chars')}: <span className="text-[var(--color-text-secondary)]">{content.length}</span></span>
          <span>{t('admin.lines')}: <span className="text-[var(--color-text-secondary)]">{content.split('\n').length}</span></span>
        </div>
      </div>
      {/* 保存确认弹窗 */}
      {showSaveConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSaveConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-surface)] rounded-xl p-6 w-[400px] shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Save size={18} className="text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('admin.confirmSaveTitle')}</h3>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed">
              {t('admin.confirmSaveMessage')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSaveConfirm(false)}
                className="px-4 py-2 text-sm font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-[var(--color-border-surface)] rounded-lg hover:bg-[var(--color-bg-card)] transition-all"
              >
                {t('admin.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowSaveConfirm(false);
                  handleSave();
                }}
                className="px-4 py-2 text-sm font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all"
              >
                {t('admin.confirmSave')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 发布确认弹窗 */}
      {showPublishConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowPublishConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-surface)] rounded-xl p-6 w-[400px] shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Upload size={18} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('admin.confirmPublishTitle')}</h3>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed">
              {t('admin.confirmPublishMessage')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPublishConfirm(false)}
                className="px-4 py-2 text-sm font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-[var(--color-border-surface)] rounded-lg hover:bg-[var(--color-bg-card)] transition-all"
              >
                {t('admin.cancel')}
              </button>
              <button
                onClick={() => {
                  setStatus('published');
                  setShowPublishConfirm(false);
                }}
                className="px-4 py-2 text-sm font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all"
              >
                {t('admin.confirmPublish')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

    </div>
  );
}
