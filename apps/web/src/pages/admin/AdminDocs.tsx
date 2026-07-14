import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ExternalLink,
  Eye,
  FilePlus2,
  FolderPlus,
  Github,
  Loader2,
  Plus,
  Save,
  Settings2,
  Trash2,
} from 'lucide-react';
import { helpCenterApi, type HelpCenter, type HelpDocumentInput } from '../../lib/helpCenterApi';
import type { DocumentItem, SpaceInput } from '../../lib/docsApi';
import { Markdown } from '../../components/markdown/Markdown';
import { normalizeDocsMarkdown } from '../../lib/docsMarkdown';

interface DocumentFormState {
  title: string;
  parentId: string;
  description: string;
  contentMd: string;
  status: 'draft' | 'published';
}

const EMPTY_DOCUMENT: DocumentFormState = {
  title: '',
  parentId: '',
  description: '',
  contentMd: '# 新文档\n\n在这里填写用户可以直接照着操作的步骤。',
  status: 'draft',
};

function formFromDocument(document: DocumentItem): DocumentFormState {
  return {
    title: document.title,
    parentId: document.parentId ?? '',
    description: document.description ?? '',
    contentMd: document.contentMd,
    status: document.status === 'published' ? 'published' : 'draft',
  };
}

function centerFormDefaults(): SpaceInput {
  return {
    name: '',
    description: '',
    repositoryFullName: '',
    sourceMode: 'cms',
    docsRoot: 'docs',
    isPublished: true,
    sortOrder: 0,
  };
}

function sortedItems(items: DocumentItem[]): DocumentItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'zh-CN'));
}

function CenterButton({ center, active, onClick }: { center: HelpCenter; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`nowen-focus w-full rounded-xl border p-3.5 text-left transition ${
        active
          ? 'border-[color-mix(in_srgb,var(--color-primary)_48%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-glass-hover)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-primary)]">
          <BookOpen className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{center.name}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{center.documentCount} 篇已发布</p>
        </div>
        <span className={`mt-1.5 h-2 w-2 rounded-full ${center.isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      </div>
    </button>
  );
}

export function AdminDocs() {
  const queryClient = useQueryClient();
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [documentForm, setDocumentForm] = useState<DocumentFormState>(EMPTY_DOCUMENT);
  const [showPreview, setShowPreview] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [centerForm, setCenterForm] = useState<SpaceInput>(centerFormDefaults());
  const [settingsForm, setSettingsForm] = useState<SpaceInput>(centerFormDefaults());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const centersQuery = useQuery({
    queryKey: ['admin', 'help-centers'],
    queryFn: helpCenterApi.listAdmin,
  });
  const selectedCenter = useMemo(
    () => centersQuery.data?.items.find((item) => item.id === selectedCenterId) ?? null,
    [centersQuery.data?.items, selectedCenterId],
  );
  const documentsQuery = useQuery({
    queryKey: ['admin', 'help-centers', selectedCenterId, 'documents'],
    queryFn: () => helpCenterApi.listDocuments(selectedCenterId),
    enabled: Boolean(selectedCenterId),
  });

  useEffect(() => {
    const items = centersQuery.data?.items ?? [];
    if (!items.length) {
      setSelectedCenterId('');
      return;
    }
    if (!items.some((item) => item.id === selectedCenterId)) setSelectedCenterId(items[0].id);
  }, [centersQuery.data?.items, selectedCenterId]);

  useEffect(() => {
    if (!selectedCenter) return;
    setSettingsForm({
      name: selectedCenter.name,
      description: selectedCenter.description ?? '',
      repositoryFullName: selectedCenter.repositoryFullName ?? '',
      sourceMode: selectedCenter.sourceMode,
      docsRoot: selectedCenter.docsRoot,
      isPublished: selectedCenter.isPublished,
      sortOrder: selectedCenter.sortOrder,
    });
  }, [selectedCenter]);

  useEffect(() => {
    if (!editingId) return;
    const current = documentsQuery.data?.items.find((item) => item.id === editingId);
    if (!current) {
      setEditingId(null);
      setDocumentForm(EMPTY_DOCUMENT);
    }
  }, [documentsQuery.data?.items, editingId]);

  const invalidateCenters = () => queryClient.invalidateQueries({ queryKey: ['admin', 'help-centers'] });
  const invalidateDocuments = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'help-centers', selectedCenterId, 'documents'] });

  const createCenter = useMutation({
    mutationFn: (payload: SpaceInput) => helpCenterApi.create(payload),
    onSuccess: (center) => {
      setSelectedCenterId(center.id);
      setCreateOpen(false);
      setCenterForm(centerFormDefaults());
      setMessage(center.sourceMode === 'github' ? '帮助中心已创建，正在从 GitHub 导入文档…' : '帮助中心已创建，并生成了“开始使用”草稿。');
      setError(null);
      void invalidateCenters();
      if (center.sourceMode === 'github') {
        void helpCenterApi
          .sync(center.id)
          .then((result) => {
            setMessage(`导入完成：新增 ${result.created}，更新 ${result.updated}，归档 ${result.archived}。`);
            void invalidateCenters();
            void queryClient.invalidateQueries({ queryKey: ['admin', 'help-centers', center.id, 'documents'] });
          })
          .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'GitHub 导入失败'));
      }
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '创建帮助中心失败'),
  });

  const updateCenter = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SpaceInput> }) => helpCenterApi.update(id, payload),
    onSuccess: () => {
      setMessage('帮助中心设置已保存。');
      setError(null);
      setSettingsOpen(false);
      void invalidateCenters();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '保存帮助中心设置失败'),
  });

  const removeCenter = useMutation({
    mutationFn: helpCenterApi.remove,
    onSuccess: () => {
      setSelectedCenterId('');
      setEditingId(null);
      setDocumentForm(EMPTY_DOCUMENT);
      setMessage('帮助中心已删除。');
      setError(null);
      void invalidateCenters();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '删除帮助中心失败'),
  });

  const syncCenter = useMutation({
    mutationFn: () => {
      if (!selectedCenter) throw new Error('请先选择帮助中心');
      return helpCenterApi.sync(selectedCenter.id);
    },
    onSuccess: (result) => {
      setMessage(`同步完成：扫描 ${result.scanned}，新增 ${result.created}，更新 ${result.updated}，归档 ${result.archived}${result.conflicts ? `，跳过冲突 ${result.conflicts}` : ''}。`);
      setError(null);
      void invalidateDocuments();
      void invalidateCenters();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : 'GitHub 同步失败'),
  });

  const saveDocument = useMutation({
    mutationFn: async () => {
      if (!selectedCenter) throw new Error('请先选择帮助中心');
      const payload: HelpDocumentInput = {
        parentId: documentForm.parentId || null,
        title: documentForm.title.trim(),
        description: documentForm.description.trim() || null,
        contentMd: documentForm.contentMd,
        status: documentForm.status,
      };
      if (!payload.title) throw new Error('请输入标题');
      return editingId
        ? helpCenterApi.updateDocument(editingId, payload)
        : helpCenterApi.createDocument(selectedCenter.id, payload);
    },
    onSuccess: (document) => {
      setEditingId(document.id);
      setDocumentForm(formFromDocument(document));
      setMessage(document.status === 'published' ? '文档已保存并公开。' : '草稿已保存。');
      setError(null);
      void invalidateDocuments();
      void invalidateCenters();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '保存文档失败'),
  });

  const deleteDocument = useMutation({
    mutationFn: helpCenterApi.deleteDocument,
    onSuccess: () => {
      setEditingId(null);
      setDocumentForm(EMPTY_DOCUMENT);
      setMessage('文档已删除。栏目下的文章会自动提升为一级页面。');
      setError(null);
      void invalidateDocuments();
      void invalidateCenters();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '删除文档失败'),
  });

  const reorderDocument = useMutation({
    mutationFn: async ({ document, direction }: { document: DocumentItem; direction: -1 | 1 }) => {
      const siblings = sortedItems(
        (documentsQuery.data?.items ?? []).filter((item) => item.parentId === document.parentId),
      );
      const index = siblings.findIndex((item) => item.id === document.id);
      const target = siblings[index + direction];
      if (!target) return;
      await Promise.all([
        helpCenterApi.updateDocument(document.id, { sortOrder: target.sortOrder }),
        helpCenterApi.updateDocument(target.id, { sortOrder: document.sortOrder }),
      ]);
    },
    onSuccess: () => void invalidateDocuments(),
    onError: (reason) => setError(reason instanceof Error ? reason.message : '调整顺序失败'),
  });

  const documents = documentsQuery.data?.items ?? [];
  const roots = useMemo(() => sortedItems(documents.filter((item) => !item.parentId)), [documents]);
  const childrenByRoot = useMemo(() => {
    const map = new Map<string, DocumentItem[]>();
    for (const item of documents) {
      if (!item.parentId) continue;
      const group = map.get(item.parentId) ?? [];
      group.push(item);
      map.set(item.parentId, group);
    }
    for (const [key, group] of map) map.set(key, sortedItems(group));
    return map;
  }, [documents]);

  const rootOptions = roots.filter((item) => item.id !== editingId);

  const startNew = (parentId: string | null = null) => {
    setEditingId(null);
    setDocumentForm({ ...EMPTY_DOCUMENT, parentId: parentId ?? '' });
    setShowPreview(false);
    setMessage(null);
    setError(null);
  };

  const editDocument = (document: DocumentItem) => {
    setEditingId(document.id);
    setDocumentForm(formFromDocument(document));
    setShowPreview(false);
    setMessage(null);
    setError(null);
  };

  return (
    <div className="p-4 lg:p-7">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]"><BookOpen className="h-5 w-5" />项目帮助中心</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text-primary)]">像写笔记一样维护帮助文档</h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">一个项目一个帮助中心，目录最多两级。系统自动处理网址、版本和 SEO。</p>
          </div>
          <button type="button" onClick={() => setCreateOpen((value) => !value)} className="nowen-button-primary nowen-focus inline-flex items-center gap-2 px-4 py-2.5 text-sm"><FolderPlus className="h-4 w-4" />新建项目帮助中心</button>
        </div>

        {(message || error) && (
          <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-500/25 bg-red-500/10 text-red-500' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600'}`}>
            {error || message}
          </div>
        )}

        {createOpen && (
          <section className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-5">
            <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-[var(--color-text-primary)]">创建帮助中心</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">只填项目名称即可。填写 GitHub 仓库后会自动导入 README 和 docs 目录。</p></div></div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-[var(--color-text-secondary)]">项目名称<input value={centerForm.name} onChange={(event) => setCenterForm((current) => ({ ...current, name: event.target.value }))} placeholder="例如：Nowen Note" className="nowen-focus mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-[var(--color-text-primary)]" /></label>
              <label className="text-sm text-[var(--color-text-secondary)]">GitHub 仓库（可不填）<input value={centerForm.repositoryFullName ?? ''} onChange={(event) => setCenterForm((current) => ({ ...current, repositoryFullName: event.target.value, sourceMode: event.target.value.trim() ? 'github' : 'cms' }))} placeholder="cropflre/nowen-note" className="nowen-focus mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 font-mono text-sm text-[var(--color-text-primary)]" /></label>
              <label className="text-sm text-[var(--color-text-secondary)] md:col-span-2">一句话说明<input value={centerForm.description ?? ''} onChange={(event) => setCenterForm((current) => ({ ...current, description: event.target.value }))} placeholder="安装、部署、功能使用和常见问题" className="nowen-focus mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-[var(--color-text-primary)]" /></label>
              {centerForm.repositoryFullName && <label className="text-sm text-[var(--color-text-secondary)]">仓库文档目录<input value={centerForm.docsRoot ?? 'docs'} onChange={(event) => setCenterForm((current) => ({ ...current, docsRoot: event.target.value }))} className="nowen-focus mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 font-mono text-sm" /></label>}
              <label className="flex items-end gap-2 pb-3 text-sm text-[var(--color-text-secondary)]"><input type="checkbox" checked={centerForm.isPublished ?? true} onChange={(event) => setCenterForm((current) => ({ ...current, isPublished: event.target.checked }))} />创建后立即开放帮助中心</label>
            </div>
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="nowen-button-secondary nowen-focus px-4 py-2 text-sm">取消</button><button type="button" onClick={() => createCenter.mutate(centerForm)} disabled={createCenter.isPending || !centerForm.name?.trim()} className="nowen-button-primary nowen-focus inline-flex items-center gap-2 px-5 py-2 text-sm">{createCenter.isPending && <Loader2 className="h-4 w-4 animate-spin" />}创建并开始写</button></div>
          </section>
        )}

        <div className="mt-6 grid min-h-[720px] gap-5 xl:grid-cols-[250px_330px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-3">
            <div className="flex items-center justify-between px-2 py-2"><h2 className="text-sm font-semibold text-[var(--color-text-primary)]">项目</h2><span className="text-xs text-[var(--color-text-muted)]">{centersQuery.data?.items.length ?? 0}</span></div>
            <div className="mt-2 space-y-2">{centersQuery.isPending ? <p className="p-4 text-center text-sm text-[var(--color-text-muted)]">加载中…</p> : centersQuery.data?.items.map((center) => <CenterButton key={center.id} center={center} active={center.id === selectedCenterId} onClick={() => { setSelectedCenterId(center.id); setEditingId(null); setDocumentForm(EMPTY_DOCUMENT); setSettingsOpen(false); }} />)}</div>
          </aside>

          <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-3">
            {selectedCenter ? (
              <>
                <div className="border-b border-[var(--color-border)] px-2 pb-4 pt-2">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-semibold text-[var(--color-text-primary)]">{selectedCenter.name} 帮助中心</h2><p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">/docs/{selectedCenter.slug}</p></div><button type="button" onClick={() => setSettingsOpen((value) => !value)} className="nowen-focus flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)]" aria-label="帮助中心设置"><Settings2 className="h-4 w-4" /></button></div>
                  <div className="mt-3 flex gap-2"><a href={`/docs/${selectedCenter.slug}`} target="_blank" rel="noreferrer" className="nowen-button-secondary nowen-focus inline-flex flex-1 items-center justify-center gap-2 px-3 py-2 text-xs"><ExternalLink className="h-3.5 w-3.5" />查看前台</a>{selectedCenter.sourceMode === 'github' && <button type="button" onClick={() => syncCenter.mutate()} disabled={syncCenter.isPending} className="nowen-button-secondary nowen-focus inline-flex flex-1 items-center justify-center gap-2 px-3 py-2 text-xs"><Github className="h-3.5 w-3.5" />{syncCenter.isPending ? '同步中…' : '同步 GitHub'}</button>}</div>
                </div>

                {settingsOpen && (
                  <div className="mx-1 mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                    <input value={settingsForm.name ?? ''} onChange={(event) => setSettingsForm((current) => ({ ...current, name: event.target.value }))} className="nowen-focus h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm" placeholder="项目名称" />
                    <input value={settingsForm.description ?? ''} onChange={(event) => setSettingsForm((current) => ({ ...current, description: event.target.value }))} className="nowen-focus mt-2 h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm" placeholder="帮助中心简介" />
                    <input value={settingsForm.repositoryFullName ?? ''} onChange={(event) => setSettingsForm((current) => ({ ...current, repositoryFullName: event.target.value, sourceMode: event.target.value.trim() ? 'github' : 'cms' }))} className="nowen-focus mt-2 h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 font-mono text-xs" placeholder="GitHub 仓库（可不填）" />
                    <label className="mt-3 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]"><input type="checkbox" checked={settingsForm.isPublished ?? true} onChange={(event) => setSettingsForm((current) => ({ ...current, isPublished: event.target.checked }))} />公开帮助中心</label>
                    <button type="button" onClick={() => updateCenter.mutate({ id: selectedCenter.id, payload: settingsForm })} className="nowen-button-primary nowen-focus mt-3 w-full px-3 py-2 text-sm">保存设置</button>
                    <button type="button" onClick={() => { if (window.confirm(`确定删除“${selectedCenter.name} 帮助中心”吗？所有帮助文档都会被删除。`)) removeCenter.mutate(selectedCenter.id); }} className="nowen-focus mt-2 w-full rounded-lg px-3 py-2 text-xs text-red-500 hover:bg-red-500/10"><Trash2 className="mr-1 inline h-3.5 w-3.5" />删除帮助中心</button>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between px-2"><div><h3 className="text-sm font-semibold text-[var(--color-text-primary)]">目录</h3><p className="mt-1 text-[11px] text-[var(--color-text-muted)]">最多一级栏目 + 二级文章</p></div><button type="button" onClick={() => startNew()} className="nowen-focus inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-[var(--color-primary)] hover:bg-[var(--color-glass-hover)]"><FilePlus2 className="h-3.5 w-3.5" />新建一级</button></div>
                <div className="mt-2 max-h-[535px] space-y-2 overflow-y-auto px-1">
                  {documentsQuery.isPending ? <p className="p-4 text-center text-xs text-[var(--color-text-muted)]">加载目录…</p> : roots.length ? roots.map((root) => (
                    <div key={root.id} className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-secondary)] p-1.5">
                      <div className="flex items-center gap-1"><button type="button" onClick={() => editDocument(root)} className={`nowen-focus min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left text-sm font-medium ${editingId === root.id ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]' : 'text-[var(--color-text-primary)] hover:bg-[var(--color-glass-hover)]'}`}><span className="truncate">{root.title}</span></button><button type="button" onClick={() => startNew(root.id)} className="nowen-focus flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-primary)] hover:bg-[var(--color-glass-hover)]" title="在此栏目下添加文章"><Plus className="h-3.5 w-3.5" /></button></div>
                      {(childrenByRoot.get(root.id) ?? []).map((child) => (
                        <div key={child.id} className="mt-0.5 flex items-center gap-1 pl-3"><span className="h-4 w-px bg-[var(--color-border)]" /><button type="button" onClick={() => editDocument(child)} className={`nowen-focus min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left text-sm ${editingId === child.id ? 'bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-text-primary)]'}`}><span className="truncate">{child.title}</span></button><button type="button" onClick={() => reorderDocument.mutate({ document: child, direction: -1 })} className="nowen-focus flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-glass-hover)]"><ArrowUp className="h-3 w-3" /></button><button type="button" onClick={() => reorderDocument.mutate({ document: child, direction: 1 })} className="nowen-focus flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-glass-hover)]"><ArrowDown className="h-3 w-3" /></button></div>
                      ))}
                    </div>
                  )) : <div className="p-8 text-center text-xs text-[var(--color-text-muted)]"><FilePlus2 className="mx-auto h-8 w-8" /><p className="mt-3">还没有文档</p><button type="button" onClick={() => startNew()} className="mt-3 text-[var(--color-primary)]">创建第一篇</button></div>}
                </div>
              </>
            ) : <div className="flex h-full items-center justify-center p-8 text-center text-sm text-[var(--color-text-muted)]">先创建一个项目帮助中心。</div>}
          </aside>

          <section className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)]">
            {selectedCenter ? (
              <div className="flex h-full min-h-[720px] flex-col">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4"><div><p className="text-sm font-semibold text-[var(--color-text-primary)]">{editingId ? '编辑帮助文档' : '新建帮助文档'}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{documentForm.parentId ? '二级文章' : '一级栏目或页面'} · 系统自动生成网址</p></div><div className="flex gap-2"><button type="button" onClick={() => setShowPreview((value) => !value)} className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-3 py-2 text-sm"><Eye className="h-4 w-4" />{showPreview ? '继续编辑' : '预览'}</button><button type="button" onClick={() => saveDocument.mutate()} disabled={saveDocument.isPending} className="nowen-button-primary nowen-focus inline-flex items-center gap-2 px-4 py-2 text-sm">{saveDocument.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}保存</button></div></header>

                {showPreview ? (
                  <div className="flex-1 overflow-auto px-6 py-8 lg:px-10"><article className="mx-auto max-w-3xl"><h1 className="text-3xl font-semibold text-[var(--color-text-primary)]">{documentForm.title || '未命名文档'}</h1>{documentForm.description && <p className="mt-3 text-[var(--color-text-secondary)]">{documentForm.description}</p>}<div className="mt-8"><Markdown content={normalizeDocsMarkdown(documentForm.contentMd)} /></div></article></div>
                ) : (
                  <div className="flex-1 overflow-auto p-5 lg:p-6">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                      <label className="text-sm text-[var(--color-text-secondary)]">标题<input value={documentForm.title} onChange={(event) => setDocumentForm((current) => ({ ...current, title: event.target.value }))} placeholder="例如：Docker 部署" className="nowen-focus mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-lg font-medium text-[var(--color-text-primary)]" /></label>
                      <label className="text-sm text-[var(--color-text-secondary)]">放在哪个栏目<select value={documentForm.parentId} onChange={(event) => setDocumentForm((current) => ({ ...current, parentId: event.target.value }))} className="nowen-focus mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-sm"><option value="">一级栏目或页面</option>{rootOptions.map((root) => <option key={root.id} value={root.id}>{root.title}</option>)}</select></label>
                      <label className="text-sm text-[var(--color-text-secondary)] md:col-span-2">一句话说明（可不填）<input value={documentForm.description} onChange={(event) => setDocumentForm((current) => ({ ...current, description: event.target.value }))} placeholder="告诉用户这篇文档能解决什么问题" className="nowen-focus mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-sm" /></label>
                    </div>
                    <label className="mt-5 block text-sm text-[var(--color-text-secondary)]">文档内容<textarea value={documentForm.contentMd} onChange={(event) => setDocumentForm((current) => ({ ...current, contentMd: event.target.value }))} className="nowen-focus mt-1.5 min-h-[430px] w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 font-mono text-sm leading-7 text-[var(--color-text-primary)]" /></label>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"><label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]"><input type="checkbox" checked={documentForm.status === 'published'} onChange={(event) => setDocumentForm((current) => ({ ...current, status: event.target.checked ? 'published' : 'draft' }))} />保存后立即公开</label>{editingId && <button type="button" onClick={() => { if (window.confirm('确定删除这篇文档吗？')) deleteDocument.mutate(editingId); }} className="nowen-focus inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"><Trash2 className="h-4 w-4" />删除文档</button>}</div>
                  </div>
                )}
              </div>
            ) : <div className="flex min-h-[720px] items-center justify-center p-8 text-center text-sm text-[var(--color-text-muted)]">创建帮助中心后即可开始写文档。</div>}
          </section>
        </div>
      </div>
    </div>
  );
}
