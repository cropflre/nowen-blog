import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Markdown } from '../markdown/Markdown';
import { MediaPicker } from './MediaPicker';
import type { AdminPostInput, AdminPostView } from '../../types';

type FormState = {
  title: string;
  slug: string;
  summary: string;
  contentMd: string;
  coverUrl: string;
  categoryIds: string[];
  tagIds: string[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
};

const EMPTY: FormState = {
  title: '',
  slug: '',
  summary: '',
  contentMd: '',
  coverUrl: '',
  categoryIds: [],
  tagIds: [],
  seoTitle: '',
  seoDescription: '',
  canonicalUrl: '',
};

function buildPayload(form: FormState): AdminPostInput {
  return {
    title: form.title.trim(),
    contentMd: form.contentMd,
    slug: form.slug.trim() ? form.slug.trim() : undefined,
    summary: form.summary.trim() ? form.summary.trim() : null,
    coverUrl: form.coverUrl.trim() ? form.coverUrl.trim() : null,
    categoryIds: form.categoryIds,
    tagIds: form.tagIds,
    seoTitle: form.seoTitle.trim() ? form.seoTitle.trim() : null,
    seoDescription: form.seoDescription.trim() ? form.seoDescription.trim() : null,
    canonicalUrl: form.canonicalUrl.trim() ? form.canonicalUrl.trim() : null,
  };
}

export function AdminPostEditor({ postId }: { postId?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const prefilled = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosRef = useRef<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'cover' | 'insert'>('cover');

  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin', 'post', postId],
    queryFn: () => api.getAdminPost(postId!),
    enabled: !!postId,
  });

  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: api.listAdminCategories });
  const { data: tags } = useQuery({ queryKey: ['tags'], queryFn: api.listAdminTags });

  useEffect(() => {
    if (existing && !prefilled.current) {
      prefilled.current = true;
      setForm({
        title: existing.title,
        slug: existing.slug,
        summary: existing.summary ?? '',
        contentMd: existing.contentMd,
        coverUrl: existing.coverUrl ?? '',
        categoryIds: existing.categoryIds,
        tagIds: existing.tagIds,
        seoTitle: existing.seoTitle ?? '',
        seoDescription: existing.seoDescription ?? '',
        canonicalUrl: existing.canonicalUrl ?? '',
      });
    }
  }, [existing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggle = (key: 'categoryIds' | 'tagIds', id: string, checked: boolean) =>
    setForm((f) => ({
      ...f,
      [key]: checked ? [...f[key], id] : f[key].filter((x) => x !== id),
    }));

  const handlePickCover = () => {
    setPickerMode('cover');
    setPickerOpen(true);
  };

  const handleInsertImage = () => {
    setPickerMode('insert');
    // 记录当前光标位置
    if (textareaRef.current && document.activeElement === textareaRef.current) {
      cursorPosRef.current = textareaRef.current.selectionStart;
    } else {
      cursorPosRef.current = null;
    }
    setPickerOpen(true);
  };

  const handlePickerSelect = (asset: { url: string; alt: string | null; filename: string | null }) => {
    if (pickerMode === 'cover') {
      setForm((f) => ({ ...f, coverUrl: asset.url }));
    } else {
      const alt = asset.alt || asset.filename || '';
      const markdown = `![${alt}](${asset.url})`;
      const textarea = textareaRef.current;
      const cursorPos = cursorPosRef.current;

      // 判断是否有有效的光标位置
      if (textarea && cursorPos !== null && cursorPos >= 0 && cursorPos <= form.contentMd.length) {
        // 在记录的光标位置插入
        const newContent = form.contentMd.substring(0, cursorPos) + markdown + form.contentMd.substring(cursorPos);
        setForm((f) => ({ ...f, contentMd: newContent }));
        // 恢复光标位置到插入的图片后面
        setTimeout(() => {
          const newPos = cursorPos + markdown.length;
          textarea.selectionStart = textarea.selectionEnd = newPos;
          textarea.focus();
        }, 0);
      } else {
        // 无有效光标位置，追加到末尾
        const separator = form.contentMd && !form.contentMd.endsWith('\n') ? '\n' : '';
        setForm((f) => ({ ...f, contentMd: f.contentMd + separator + markdown }));
        // 如果有 textarea，将光标移到末尾
        if (textarea) {
          setTimeout(() => {
            const newPos = form.contentMd.length + separator.length + markdown.length;
            textarea.selectionStart = textarea.selectionEnd = newPos;
            textarea.focus();
          }, 0);
        }
      }
    }
  };

  const save = async (status: 'draft' | 'published') => {
    setError(null);
    if (!form.title.trim() || !form.contentMd.trim()) {
      setError('标题和正文必填');
      return;
    }
    const payload = buildPayload(form);
    if (postId) {
      await api.updateAdminPost(postId, status === 'published' ? payload : { ...payload, status });
      if (status === 'published') await api.publishAdminPost(postId);
    } else {
      await api.createAdminPost({ ...payload, status });
    }
    qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
    navigate('/admin/posts');
  };

  const onSaveDraft = () => {
    setSaving(true);
    save('draft')
      .catch((e) => setError(e instanceof Error ? e.message : '保存失败'))
      .finally(() => setSaving(false));
  };

  const onPublish = () => {
    setPublishing(true);
    save('published')
      .catch((e) => setError(e instanceof Error ? e.message : '发布失败'))
      .finally(() => setPublishing(false));
  };

  if (postId && isLoading) {
    return <div className="p-8 text-muted">加载中…</div>;
  }

  const fieldCls =
    'w-full rounded-lg border border-line bg-bg px-3 py-2 text-fg outline-none focus:border-brand/60';
  const labelCls = 'mb-1 block text-sm font-medium text-fg';

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{postId ? '编辑文章' : '新建文章'}</h1>
        <button
          onClick={() => navigate('/admin/posts')}
          className="rounded-lg border border-line px-3 py-1.5 text-sm transition hover:border-brand/60"
        >
          返回列表
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>标题 *</label>
            <input
              className={fieldCls}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="文章标题"
            />
          </div>
          <div>
            <label className={labelCls}>Slug</label>
            <input
              className={fieldCls}
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              placeholder="留空则根据标题自动生成"
            />
          </div>
          <div>
            <label className={labelCls}>摘要</label>
            <textarea
              className={fieldCls}
              rows={2}
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              placeholder="可选，列表/分享卡片展示"
            />
          </div>
          <div>
            <label className={labelCls}>封面图 URL</label>
            <div className="flex gap-2">
              <input
                className={`flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-fg outline-none focus:border-brand/60 ${form.coverUrl ? 'pr-2' : ''}`}
                value={form.coverUrl}
                onChange={(e) => set('coverUrl', e.target.value)}
                placeholder="https://…"
              />
              <button
                type="button"
                onClick={handlePickCover}
                className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm transition hover:border-brand/60"
              >
                选择
              </button>
              {form.coverUrl && (
                <button
                  type="button"
                  onClick={() => set('coverUrl', '')}
                  className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm text-red-400 transition hover:border-red-500/60"
                >
                  清空
                </button>
              )}
            </div>
            {form.coverUrl && (
              <div className="mt-2">
                <img
                  src={form.coverUrl}
                  alt="封面预览"
                  className="h-32 rounded-lg border border-line object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className={labelCls}>正文 (Markdown) *</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInsertImage}
                  className="text-xs text-brand hover:underline"
                >
                  插入图片
                </button>
                <button
                  type="button"
                  onClick={() => setPreview((p) => !p)}
                  className="text-xs text-brand hover:underline"
                >
                  {preview ? '编辑' : '预览'}
                </button>
              </div>
            </div>
            {preview ? (
              <div className="min-h-[240px] rounded-lg border border-line bg-surface p-4">
                <Markdown content={form.contentMd} />
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                className={fieldCls}
                rows={14}
                value={form.contentMd}
                onChange={(e) => set('contentMd', e.target.value)}
                placeholder="# 正文内容（支持 Markdown）"
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>分类</label>
            <div className="flex flex-wrap gap-2">
              {(cats?.items ?? []).map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.categoryIds.includes(c.id)}
                    onChange={(e) => toggle('categoryIds', c.id, e.target.checked)}
                  />
                  {c.name}
                </label>
              ))}
              {(cats?.items.length ?? 0) === 0 && (
                <span className="text-sm text-muted">暂无分类</span>
              )}
            </div>
          </div>
          <div>
            <label className={labelCls}>标签</label>
            <div className="flex flex-wrap gap-2">
              {(tags?.items ?? []).map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.tagIds.includes(t.id)}
                    onChange={(e) => toggle('tagIds', t.id, e.target.checked)}
                  />
                  {t.name}
                </label>
              ))}
              {(tags?.items.length ?? 0) === 0 && (
                <span className="text-sm text-muted">暂无标签</span>
              )}
            </div>
          </div>

          <details className="rounded-lg border border-line p-3">
            <summary className="cursor-pointer text-sm font-medium text-fg">SEO 设置</summary>
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelCls}>SEO 标题</label>
                <input
                  className={fieldCls}
                  value={form.seoTitle}
                  onChange={(e) => set('seoTitle', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>SEO 描述</label>
                <textarea
                  className={fieldCls}
                  rows={2}
                  value={form.seoDescription}
                  onChange={(e) => set('seoDescription', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Canonical URL</label>
                <input
                  className={fieldCls}
                  value={form.canonicalUrl}
                  onChange={(e) => set('canonicalUrl', e.target.value)}
                />
              </div>
            </div>
          </details>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onSaveDraft}
          disabled={saving || publishing}
          className="rounded-lg border border-line px-4 py-2 text-sm transition hover:border-brand/60 disabled:opacity-40"
        >
          {saving ? '保存中…' : '保存草稿'}
        </button>
        <button
          onClick={onPublish}
          disabled={saving || publishing}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {publishing ? '发布中…' : '发布'}
        </button>
      </div>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
      />
    </div>
  );
}
