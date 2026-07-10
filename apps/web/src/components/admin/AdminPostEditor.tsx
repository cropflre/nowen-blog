import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  History,
  Loader2,
  Pin,
  RotateCcw,
  Save,
  Send,
  Star,
} from 'lucide-react';
import { api } from '../../lib/api';
import { adminPostWorkflowApi } from '../../lib/adminPostWorkflowApi';
import { Markdown } from '../markdown/Markdown';
import { MediaPicker } from './MediaPicker';
import type {
  AdminPostInput,
  AdminPostView,
  PostStatus,
  PostVersionItem,
  PostVisibility,
} from '../../types';

const NEW_DRAFT_KEY = 'nowen-blog-new-post-autosave-v1';
const AUTOSAVE_DELAY = 2500;

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
  status: PostStatus;
  visibility: PostVisibility;
  isFeatured: boolean;
  isPinned: boolean;
  scheduledAt: string;
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
  status: 'draft',
  visibility: 'public',
  isFeatured: false,
  isPinned: false,
  scheduledAt: '',
};

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: '草稿',
  scheduled: '定时发布',
  published: '已发布',
  archived: '已归档',
};

const VERSION_REASON: Record<string, string> = {
  create: '创建文章',
  save: '手动保存',
  schedule: '设置定时发布',
  publish: '立即发布',
  scheduled_publish: '定时发布',
  unpublish: '转为草稿',
  archive: '归档文章',
  restore: '恢复历史版本',
};

function toLocalDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (input: number) => String(input).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDateTime(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formFromPost(post: AdminPostView): FormState {
  return {
    title: post.title,
    slug: post.slug,
    summary: post.summary ?? '',
    contentMd: post.contentMd,
    coverUrl: post.coverUrl ?? '',
    categoryIds: post.categoryIds,
    tagIds: post.tagIds,
    seoTitle: post.seoTitle ?? '',
    seoDescription: post.seoDescription ?? '',
    canonicalUrl: post.canonicalUrl ?? '',
    status: post.status,
    visibility: post.visibility,
    isFeatured: post.isFeatured,
    isPinned: post.isPinned,
    scheduledAt: toLocalDateTime(post.scheduledAt),
  };
}

function formFromPayload(payload: Partial<AdminPostInput>, fallback: FormState): FormState {
  return {
    title: payload.title ?? fallback.title,
    slug: payload.slug ?? fallback.slug,
    summary: payload.summary ?? fallback.summary,
    contentMd: payload.contentMd ?? fallback.contentMd,
    coverUrl: payload.coverUrl ?? fallback.coverUrl,
    categoryIds: payload.categoryIds ?? fallback.categoryIds,
    tagIds: payload.tagIds ?? fallback.tagIds,
    seoTitle: payload.seoTitle ?? fallback.seoTitle,
    seoDescription: payload.seoDescription ?? fallback.seoDescription,
    canonicalUrl: payload.canonicalUrl ?? fallback.canonicalUrl,
    status: payload.status ?? fallback.status,
    visibility: payload.visibility ?? fallback.visibility,
    isFeatured: payload.isFeatured ?? fallback.isFeatured,
    isPinned: payload.isPinned ?? fallback.isPinned,
    scheduledAt:
      payload.scheduledAt !== undefined
        ? toLocalDateTime(payload.scheduledAt)
        : fallback.scheduledAt,
  };
}

function buildPayload(form: FormState, status: PostStatus = form.status): AdminPostInput {
  return {
    title: form.title.trim(),
    contentMd: form.contentMd,
    slug: form.slug.trim() || undefined,
    summary: form.summary.trim() || null,
    coverUrl: form.coverUrl.trim() || null,
    status,
    visibility: form.visibility,
    isFeatured: form.isFeatured,
    isPinned: form.isPinned,
    scheduledAt: status === 'scheduled' ? toIsoDateTime(form.scheduledAt) : null,
    categoryIds: form.categoryIds,
    tagIds: form.tagIds,
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    canonicalUrl: form.canonicalUrl.trim() || null,
  };
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function AdminPostEditor({ postId }: { postId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [savingAction, setSavingAction] = useState<PostStatus | 'archive' | 'restore' | null>(null);
  const [autosaveState, setAutosaveState] = useState('');
  const [pendingAutosave, setPendingAutosave] = useState<Partial<AdminPostInput> | null>(null);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const prefilled = useRef(false);
  const autosavePrompted = useRef(false);
  const lastSavedJson = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosRef = useRef<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'cover' | 'insert'>('cover');

  const postQuery = useQuery({
    queryKey: ['admin', 'post', postId],
    queryFn: () => api.getAdminPost(postId!),
    enabled: !!postId,
  });
  const autosaveQuery = useQuery({
    queryKey: ['admin', 'post-autosave', postId],
    queryFn: () => adminPostWorkflowApi.getAutosave(postId!),
    enabled: !!postId,
  });
  const versionsQuery = useQuery({
    queryKey: ['admin', 'post-versions', postId],
    queryFn: () => adminPostWorkflowApi.listVersions(postId!),
    enabled: !!postId,
  });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: api.listAdminCategories });
  const { data: tags } = useQuery({ queryKey: ['tags'], queryFn: api.listAdminTags });

  useEffect(() => {
    if (postId || prefilled.current) return;
    prefilled.current = true;
    try {
      const raw = window.localStorage.getItem(NEW_DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<FormState>;
        const restored = { ...EMPTY, ...saved };
        setForm(restored);
        setAutosaveState('已恢复本机自动草稿');
      }
    } catch {
      // localStorage 不可用时不影响编辑器。
    }
  }, [postId]);

  useEffect(() => {
    if (!postQuery.data || prefilled.current) return;
    const initial = formFromPost(postQuery.data);
    prefilled.current = true;
    setForm(initial);
    lastSavedJson.current = JSON.stringify(buildPayload(initial));
  }, [postQuery.data]);

  useEffect(() => {
    const autosave = autosaveQuery.data?.autosave;
    const existing = postQuery.data;
    if (!autosave || !existing || autosavePrompted.current) return;
    autosavePrompted.current = true;
    if (new Date(autosave.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
      setPendingAutosave(autosave.payload);
      setAutosaveState(`检测到 ${formatTime(autosave.updatedAt)} 的自动草稿`);
    }
  }, [autosaveQuery.data, postQuery.data]);

  useEffect(() => {
    if (!prefilled.current) return;
    const payload = buildPayload(form);
    const serialized = JSON.stringify(payload);
    if (postId && serialized === lastSavedJson.current) return;

    setAutosaveState('有未保存更改');
    const timer = window.setTimeout(() => {
      if (postId) {
        void adminPostWorkflowApi
          .saveAutosave(postId, payload)
          .then((saved) => setAutosaveState(`已自动保存 ${formatTime(saved.updatedAt)}`))
          .catch(() => setAutosaveState('自动保存失败，手动保存不受影响'));
      } else {
        try {
          window.localStorage.setItem(NEW_DRAFT_KEY, JSON.stringify(form));
          setAutosaveState('已自动保存到本机');
        } catch {
          setAutosaveState('本机自动保存不可用');
        }
      }
    }, AUTOSAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [form, postId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleTaxonomy = (key: 'categoryIds' | 'tagIds', id: string, checked: boolean) =>
    setForm((current) => ({
      ...current,
      [key]: checked ? [...current[key], id] : current[key].filter((item) => item !== id),
    }));

  const handlePickerSelect = (asset: { url: string; alt: string | null; filename: string | null }) => {
    if (pickerMode === 'cover') {
      set('coverUrl', asset.url);
      return;
    }
    const markdown = `![${asset.alt || asset.filename || ''}](${asset.url})`;
    const cursor = cursorPosRef.current;
    if (cursor !== null && cursor >= 0 && cursor <= form.contentMd.length) {
      const next = `${form.contentMd.slice(0, cursor)}${markdown}${form.contentMd.slice(cursor)}`;
      set('contentMd', next);
      window.setTimeout(() => {
        if (!textareaRef.current) return;
        const nextPosition = cursor + markdown.length;
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = nextPosition;
        textareaRef.current.focus();
      }, 0);
      return;
    }
    const separator = form.contentMd && !form.contentMd.endsWith('\n') ? '\n' : '';
    set('contentMd', `${form.contentMd}${separator}${markdown}`);
  };

  const validate = (status: PostStatus): string | null => {
    if (!form.title.trim() || !form.contentMd.trim()) return '标题和正文必填';
    if (status === 'scheduled') {
      const timestamp = new Date(form.scheduledAt).getTime();
      if (!form.scheduledAt || !Number.isFinite(timestamp)) return '请选择有效的定时发布时间';
      if (timestamp <= Date.now()) return '定时发布时间必须晚于当前时间';
    }
    return null;
  };

  const save = async (status: PostStatus) => {
    const validationError = validate(status);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSavingAction(status);
    setError(null);
    setSuccess(null);
    try {
      const payload = buildPayload(form, status);
      if (postId) {
        const updated = await api.updateAdminPost(postId, payload);
        const nextForm = formFromPost(updated);
        setForm(nextForm);
        lastSavedJson.current = JSON.stringify(buildPayload(nextForm));
        await adminPostWorkflowApi.deleteAutosave(postId).catch(() => undefined);
        queryClient.setQueryData(['admin', 'post', postId], updated);
        await queryClient.invalidateQueries({ queryKey: ['admin', 'post-versions', postId] });
        setSuccess(status === 'scheduled' ? '定时发布已设置。' : status === 'published' ? '文章已发布。' : '文章已保存。');
        setAutosaveState('所有更改已保存');
      } else {
        const created = await api.createAdminPost(payload);
        try {
          window.localStorage.removeItem(NEW_DRAFT_KEY);
        } catch {
          // ignore
        }
        await queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
        navigate(`/admin/posts/${created.id}/edit`, { replace: true });
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败');
    } finally {
      setSavingAction(null);
    }
  };

  const changeArchiveState = async (archive: boolean) => {
    if (!postId) return;
    if (archive && !confirm('归档后文章将从前台隐藏，确定继续吗？')) return;
    setSavingAction(archive ? 'archive' : 'restore');
    setError(null);
    setSuccess(null);
    try {
      const updated = archive
        ? await adminPostWorkflowApi.archive(postId)
        : await adminPostWorkflowApi.restore(postId);
      const nextForm = formFromPost(updated);
      setForm(nextForm);
      lastSavedJson.current = JSON.stringify(buildPayload(nextForm));
      queryClient.setQueryData(['admin', 'post', postId], updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'post-versions', postId] }),
      ]);
      setSuccess(archive ? '文章已归档。' : '文章已恢复为草稿。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败');
    } finally {
      setSavingAction(null);
    }
  };

  const restoreVersion = async (version: PostVersionItem) => {
    if (!postId || !confirm(`确定恢复到版本 V${version.version}？当前正式内容会先保留为新的历史版本。`)) return;
    setRestoringVersionId(version.id);
    setError(null);
    setSuccess(null);
    try {
      const restored = await adminPostWorkflowApi.restoreVersion(postId, version.id);
      const nextForm = formFromPost(restored);
      setForm(nextForm);
      lastSavedJson.current = JSON.stringify(buildPayload(nextForm));
      queryClient.setQueryData(['admin', 'post', postId], restored);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'post-versions', postId] });
      setSuccess(`已恢复到版本 V${version.version}，并生成新的恢复记录。`);
      setAutosaveState('所有更改已保存');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '版本恢复失败');
    } finally {
      setRestoringVersionId(null);
    }
  };

  const restoreAutosave = () => {
    if (!pendingAutosave) return;
    setForm((current) => formFromPayload(pendingAutosave, current));
    setPendingAutosave(null);
    setAutosaveState('已恢复自动草稿，请确认后手动保存');
  };

  const discardAutosave = async () => {
    if (postId) await adminPostWorkflowApi.deleteAutosave(postId).catch(() => undefined);
    setPendingAutosave(null);
    setAutosaveState('已忽略旧的自动草稿');
  };

  if (postId && postQuery.isLoading) return <div className="p-8 text-muted">加载中…</div>;
  if (postId && postQuery.isError) {
    return <div className="p-8 text-red-400">文章加载失败：{postQuery.error instanceof Error ? postQuery.error.message : '未知错误'}</div>;
  }

  const fieldClass = 'w-full rounded-lg border border-line bg-bg px-3 py-2 text-fg outline-none transition focus:border-brand/60';
  const labelClass = 'mb-1 block text-sm font-medium text-fg';
  const busy = savingAction !== null;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{postId ? '编辑文章' : '新建文章'}</h1>
            <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">{STATUS_LABEL[form.status]}</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              {form.visibility === 'public' ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {form.visibility === 'public' ? '公开' : '私密'}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <Clock3 className="h-3.5 w-3.5" />{autosaveState || '自动保存已启用'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/posts')}
          className="rounded-lg border border-line px-3 py-1.5 text-sm transition hover:border-brand/60"
        >
          返回列表
        </button>
      </header>

      {pendingAutosave && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm">
          <span className="text-sky-300">检测到比正式文章更新的自动草稿。</span>
          <div className="flex gap-2">
            <button type="button" onClick={restoreAutosave} className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white">恢复草稿</button>
            <button type="button" onClick={() => void discardAutosave()} className="rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs text-sky-300">忽略</button>
          </div>
        </div>
      )}

      {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />{success}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
        <div className="space-y-5">
          <section className="space-y-4 rounded-card border border-line bg-surface p-5 lg:p-6">
            <div>
              <label className={labelClass}>标题 *</label>
              <input className={fieldClass} value={form.title} onChange={(event) => set('title', event.target.value)} placeholder="文章标题" />
            </div>
            <div>
              <label className={labelClass}>Slug</label>
              <input className={fieldClass} value={form.slug} onChange={(event) => set('slug', event.target.value)} placeholder="留空则根据标题自动生成" />
            </div>
            <div>
              <label className={labelClass}>摘要</label>
              <textarea className={fieldClass} rows={3} value={form.summary} onChange={(event) => set('summary', event.target.value)} placeholder="用于文章列表和分享卡片" />
            </div>
            <div>
              <label className={labelClass}>封面图 URL</label>
              <div className="flex gap-2">
                <input className={`${fieldClass} flex-1`} value={form.coverUrl} onChange={(event) => set('coverUrl', event.target.value)} placeholder="https://… 或 /uploads/…" />
                <button type="button" onClick={() => { setPickerMode('cover'); setPickerOpen(true); }} className="rounded-lg border border-line px-3 py-2 text-sm transition hover:border-brand/60">选择</button>
                {form.coverUrl && <button type="button" onClick={() => set('coverUrl', '')} className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-400">清空</button>}
              </div>
              {form.coverUrl && <img src={form.coverUrl} alt="封面预览" className="mt-3 h-40 w-full rounded-xl border border-line object-cover" />}
            </div>
          </section>

          <section className="rounded-card border border-line bg-surface p-5 lg:p-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className={labelClass}>正文（Markdown）*</label>
              <div className="flex gap-3 text-xs">
                <button type="button" onClick={() => { cursorPosRef.current = textareaRef.current?.selectionStart ?? null; setPickerMode('insert'); setPickerOpen(true); }} className="text-brand hover:underline">插入图片</button>
                <button type="button" onClick={() => setPreview((current) => !current)} className="text-brand hover:underline">{preview ? '返回编辑' : '预览文章'}</button>
              </div>
            </div>
            {preview ? (
              <div className="min-h-[420px] rounded-xl border border-line bg-bg p-5"><Markdown content={form.contentMd} /></div>
            ) : (
              <textarea ref={textareaRef} className={`${fieldClass} min-h-[520px] resize-y font-mono text-sm leading-7`} value={form.contentMd} onChange={(event) => set('contentMd', event.target.value)} placeholder="# 正文内容" />
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="font-semibold">发布设置</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className={labelClass}>可见性</label>
                <select className={fieldClass} value={form.visibility} onChange={(event) => set('visibility', event.target.value as PostVisibility)}>
                  <option value="public">公开：所有读者可访问</option>
                  <option value="private">私密：仅后台可见</option>
                </select>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3">
                <input type="checkbox" className="mt-1" checked={form.isFeatured} onChange={(event) => set('isFeatured', event.target.checked)} />
                <span><span className="flex items-center gap-1.5 text-sm font-medium"><Star className="h-4 w-4 text-amber-400" />精选文章</span><span className="mt-1 block text-xs text-muted">显示在首页精选区域</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3">
                <input type="checkbox" className="mt-1" checked={form.isPinned} onChange={(event) => set('isPinned', event.target.checked)} />
                <span><span className="flex items-center gap-1.5 text-sm font-medium"><Pin className="h-4 w-4 text-brand" />置顶文章</span><span className="mt-1 block text-xs text-muted">在文章列表中优先排序</span></span>
              </label>
              <div>
                <label className={labelClass}>定时发布时间</label>
                <input type="datetime-local" className={fieldClass} value={form.scheduledAt} onChange={(event) => set('scheduledAt', event.target.value)} />
                <p className="mt-1 text-xs text-muted">按照浏览器本地时区填写，服务端保存为 UTC。</p>
              </div>
            </div>
          </section>

          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="font-semibold">分类与标签</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className={labelClass}>分类</label>
                <div className="flex flex-wrap gap-2">
                  {(categories?.items ?? []).map((category) => (
                    <label key={category.id} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs">
                      <input type="checkbox" checked={form.categoryIds.includes(category.id)} onChange={(event) => toggleTaxonomy('categoryIds', category.id, event.target.checked)} />{category.name}
                    </label>
                  ))}
                  {(categories?.items.length ?? 0) === 0 && <span className="text-xs text-muted">暂无分类</span>}
                </div>
              </div>
              <div>
                <label className={labelClass}>标签</label>
                <div className="flex flex-wrap gap-2">
                  {(tags?.items ?? []).map((tag) => (
                    <label key={tag.id} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs">
                      <input type="checkbox" checked={form.tagIds.includes(tag.id)} onChange={(event) => toggleTaxonomy('tagIds', tag.id, event.target.checked)} />{tag.name}
                    </label>
                  ))}
                  {(tags?.items.length ?? 0) === 0 && <span className="text-xs text-muted">暂无标签</span>}
                </div>
              </div>
            </div>
          </section>

          <details className="rounded-card border border-line bg-surface p-5">
            <summary className="cursor-pointer font-semibold">SEO 设置</summary>
            <div className="mt-4 space-y-3">
              <div><label className={labelClass}>SEO 标题</label><input className={fieldClass} value={form.seoTitle} onChange={(event) => set('seoTitle', event.target.value)} /></div>
              <div><label className={labelClass}>SEO 描述</label><textarea className={fieldClass} rows={3} value={form.seoDescription} onChange={(event) => set('seoDescription', event.target.value)} /></div>
              <div><label className={labelClass}>Canonical URL</label><input className={fieldClass} value={form.canonicalUrl} onChange={(event) => set('canonicalUrl', event.target.value)} /></div>
            </div>
          </details>

          {postId && (
            <section className="rounded-card border border-line bg-surface p-5">
              <div className="flex items-center gap-2"><History className="h-4 w-4 text-brand" /><h2 className="font-semibold">版本历史</h2></div>
              <p className="mt-1 text-xs text-muted">手动保存、发布、归档和恢复会生成版本。</p>
              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                {versionsQuery.isLoading ? <p className="text-xs text-muted">加载版本中…</p> : (versionsQuery.data?.items.length ?? 0) === 0 ? <p className="text-xs text-muted">暂无版本记录</p> : versionsQuery.data!.items.map((version) => (
                  <div key={version.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-sm font-medium">V{version.version} · {VERSION_REASON[version.reason] ?? version.reason}</p><p className="mt-1 text-xs text-muted">{formatTime(version.createdAt)} · {version.createdByName ?? '系统'}</p></div>
                      <button type="button" disabled={restoringVersionId !== null || busy} onClick={() => void restoreVersion(version)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs transition hover:border-brand/60 disabled:opacity-40">
                        {restoringVersionId === version.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}恢复
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      <footer className="sticky bottom-0 z-20 -mx-6 flex flex-wrap items-center gap-3 border-t border-line bg-bg/95 px-6 py-4 backdrop-blur lg:-mx-8 lg:px-8">
        <button type="button" disabled={busy} onClick={() => void save(form.status === 'archived' ? 'draft' : form.status)} className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm transition hover:border-brand/60 disabled:opacity-40">
          {savingAction === form.status ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}保存更改
        </button>
        <button type="button" disabled={busy} onClick={() => void save('draft')} className="rounded-lg border border-line px-4 py-2 text-sm transition hover:border-brand/60 disabled:opacity-40">存为草稿</button>
        <button type="button" disabled={busy} onClick={() => void save('scheduled')} className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 px-4 py-2 text-sm text-sky-400 transition hover:bg-sky-500/10 disabled:opacity-40">
          {savingAction === 'scheduled' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}定时发布
        </button>
        <button type="button" disabled={busy} onClick={() => void save('published')} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">
          {savingAction === 'published' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}立即发布
        </button>
        {postId && form.status !== 'archived' && <button type="button" disabled={busy} onClick={() => void changeArchiveState(true)} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-amber-500/40 px-4 py-2 text-sm text-amber-400 transition hover:bg-amber-500/10 disabled:opacity-40"><Archive className="h-4 w-4" />归档</button>}
        {postId && form.status === 'archived' && <button type="button" disabled={busy} onClick={() => void changeArchiveState(false)} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-brand/50 px-4 py-2 text-sm text-brand disabled:opacity-40"><RotateCcw className="h-4 w-4" />恢复为草稿</button>}
      </footer>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handlePickerSelect} />
    </div>
  );
}
