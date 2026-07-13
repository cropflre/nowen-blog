import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronRight,
  Eye,
  FilePlus2,
  FolderPlus,
  Github,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import {
  docsApi,
  type DocSpace,
  type DocumentInput,
  type DocumentItem,
  type SpaceInput,
  type VersionInput,
} from '../../lib/docsApi';
import { Markdown } from '../../components/markdown/Markdown';
import { normalizeDocsMarkdown } from '../../lib/docsMarkdown';

interface DocumentFormState {
  title: string;
  path: string;
  parentId: string;
  description: string;
  contentMd: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private';
  sortOrder: number;
  editUrl: string;
  seoTitle: string;
  seoDescription: string;
}

const EMPTY_DOCUMENT: DocumentFormState = {
  title: '',
  path: '',
  parentId: '',
  description: '',
  contentMd: '# 新文档\n\n在这里编写 Markdown 文档内容。',
  status: 'draft',
  visibility: 'public',
  sortOrder: 0,
  editUrl: '',
  seoTitle: '',
  seoDescription: '',
};

function formFromDocument(document: DocumentItem): DocumentFormState {
  return {
    title: document.title,
    path: document.path,
    parentId: document.parentId ?? '',
    description: document.description ?? '',
    contentMd: document.contentMd,
    status: document.status,
    visibility: document.visibility,
    sortOrder: document.sortOrder,
    editUrl: document.editUrl ?? '',
    seoTitle: document.seoTitle ?? '',
    seoDescription: document.seoDescription ?? '',
  };
}

function documentPayload(form: DocumentFormState) {
  return {
    parentId: form.parentId || null,
    title: form.title.trim(),
    path: form.path.trim() || undefined,
    description: form.description.trim() || null,
    contentMd: form.contentMd,
    status: form.status,
    visibility: form.visibility,
    sortOrder: Number(form.sortOrder) || 0,
    editUrl: form.editUrl.trim() || null,
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
  };
}

function SpaceBadge({ space, selected, onClick }: { space: DocSpace; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`nowen-focus w-full rounded-xl border p-3 text-left transition ${
        selected
          ? 'border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-glass-hover)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{space.name}</p>
          <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">/docs/{space.slug}</p>
        </div>
        <span className={`h-2 w-2 shrink-0 rounded-full ${space.isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{space.documentCount} 篇已发布文档</p>
    </button>
  );
}

export function AdminDocs() {
  const queryClient = useQueryClient();
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [documentForm, setDocumentForm] = useState<DocumentFormState>(EMPTY_DOCUMENT);
  const [showPreview, setShowPreview] = useState(false);
  const [spaceFormOpen, setSpaceFormOpen] = useState(false);
  const [versionFormOpen, setVersionFormOpen] = useState(false);
  const [spaceForm, setSpaceForm] = useState<SpaceInput>({
    name: '',
    slug: '',
    description: '',
    sourceMode: 'cms',
    repositoryFullName: '',
    docsRoot: 'docs',
    isPublished: true,
    sortOrder: 0,
  });
  const [versionForm, setVersionForm] = useState<VersionInput>({
    version: '',
    label: '',
    sourceRef: '',
    status: 'published',
    isDefault: false,
    isDeprecated: false,
    sortOrder: 0,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const spacesQuery = useQuery({ queryKey: ['admin', 'docs', 'spaces'], queryFn: docsApi.listAdminSpaces });
  const selectedSpace = useMemo(
    () => spacesQuery.data?.items.find((space) => space.id === selectedSpaceId) ?? null,
    [selectedSpaceId, spacesQuery.data?.items],
  );
  const selectedVersion = useMemo(
    () => selectedSpace?.versions?.find((version) => version.id === selectedVersionId) ?? null,
    [selectedSpace, selectedVersionId],
  );
  const documentsQuery = useQuery({
    queryKey: ['admin', 'docs', 'documents', selectedSpaceId, selectedVersionId],
    queryFn: () => docsApi.listDocuments(selectedSpaceId, selectedVersionId),
    enabled: Boolean(selectedSpaceId && selectedVersionId),
  });

  useEffect(() => {
    const items = spacesQuery.data?.items ?? [];
    if (!items.length) {
      setSelectedSpaceId('');
      return;
    }
    if (!items.some((space) => space.id === selectedSpaceId)) setSelectedSpaceId(items[0].id);
  }, [selectedSpaceId, spacesQuery.data?.items]);

  useEffect(() => {
    const versions = selectedSpace?.versions ?? [];
    if (!versions.length) {
      setSelectedVersionId('');
      return;
    }
    if (!versions.some((version) => version.id === selectedVersionId)) {
      setSelectedVersionId((versions.find((version) => version.isDefault) ?? versions[0]).id);
    }
  }, [selectedSpace, selectedVersionId]);

  useEffect(() => {
    if (!editingId) return;
    const current = documentsQuery.data?.items.find((item) => item.id === editingId);
    if (!current) {
      setEditingId(null);
      setDocumentForm(EMPTY_DOCUMENT);
    }
  }, [documentsQuery.data?.items, editingId]);

  const invalidateSpaces = () => queryClient.invalidateQueries({ queryKey: ['admin', 'docs', 'spaces'] });
  const invalidateDocuments = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'docs', 'documents', selectedSpaceId, selectedVersionId] });

  const createSpace = useMutation({
    mutationFn: docsApi.createSpace,
    onSuccess: (space) => {
      setSelectedSpaceId(space.id);
      setSpaceFormOpen(false);
      setSpaceForm({ name: '', slug: '', description: '', sourceMode: 'cms', repositoryFullName: '', docsRoot: 'docs', isPublished: true, sortOrder: 0 });
      setMessage('文档空间已创建，并自动生成 Latest 版本。');
      setError(null);
      void invalidateSpaces();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '创建文档空间失败'),
  });

  const updateSpace = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SpaceInput> }) => docsApi.updateSpace(id, payload),
    onSuccess: () => {
      setMessage('文档空间设置已更新。');
      setError(null);
      void invalidateSpaces();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '更新文档空间失败'),
  });

  const createVersion = useMutation({
    mutationFn: ({ spaceId, payload }: { spaceId: string; payload: VersionInput }) => docsApi.createVersion(spaceId, payload),
    onSuccess: (version) => {
      setSelectedVersionId(version.id);
      setVersionFormOpen(false);
      setVersionForm({ version: '', label: '', sourceRef: '', status: 'published', isDefault: false, isDeprecated: false, sortOrder: 0 });
      setMessage('文档版本已创建。');
      setError(null);
      void invalidateSpaces();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '创建版本失败'),
  });

  const syncSpace = useMutation({
    mutationFn: () => {
      if (!selectedSpace || !selectedVersion) throw new Error('请先选择文档空间和版本');
      return docsApi.syncSpace(selectedSpace.id, { versionId: selectedVersion.id });
    },
    onSuccess: (result) => {
      setMessage(
        `GitHub 同步完成：扫描 ${result.scanned} 个文件，新增 ${result.created}、更新 ${result.updated}、未变化 ${result.unchanged}、归档 ${result.archived}${result.conflicts ? `、冲突 ${result.conflicts}` : ''}。`,
      );
      setError(null);
      void invalidateDocuments();
      void invalidateSpaces();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : 'GitHub 文档同步失败'),
  });

  const saveDocument = useMutation({
    mutationFn: async () => {
      if (!selectedSpace || !selectedVersion) throw new Error('请先选择文档空间和版本');
      const payload = documentPayload(documentForm);
      if (!payload.title) throw new Error('请输入文档标题');
      if (editingId) return docsApi.updateDocument(editingId, payload);
      const createPayload: DocumentInput = {
        spaceId: selectedSpace.id,
        versionId: selectedVersion.id,
        ...payload,
      };
      return docsApi.createDocument(createPayload);
    },
    onSuccess: (document) => {
      setEditingId(document.id);
      setDocumentForm(formFromDocument(document));
      setMessage(document.status === 'published' ? '文档已保存并发布。' : '文档草稿已保存。');
      setError(null);
      void invalidateDocuments();
      void invalidateSpaces();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '保存文档失败'),
  });

  const deleteDocument = useMutation({
    mutationFn: docsApi.deleteDocument,
    onSuccess: () => {
      setEditingId(null);
      setDocumentForm(EMPTY_DOCUMENT);
      setMessage('文档已删除。');
      setError(null);
      void invalidateDocuments();
      void invalidateSpaces();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '删除文档失败'),
  });

  const startNewDocument = () => {
    setEditingId(null);
    setDocumentForm(EMPTY_DOCUMENT);
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

  const orderedDocuments = useMemo(
    () => [...(documentsQuery.data?.items ?? [])].sort((a, b) => a.path.localeCompare(b.path, 'zh-CN')),
    [documentsQuery.data?.items],
  );

  return (
    <div className="p-5 lg:p-7">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[var(--color-primary)]"><BookOpen className="h-5 w-5" /><span className="text-sm font-semibold">Documentation CMS</span></div>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text-primary)]">文档中心</h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">管理项目空间、版本、目录层级、Markdown 内容和发布状态。</p>
          </div>
          <button type="button" onClick={() => setSpaceFormOpen((value) => !value)} className="nowen-button-primary nowen-focus inline-flex items-center gap-2 px-4 py-2.5 text-sm">
            <FolderPlus className="h-4 w-4" /> 新建文档空间
          </button>
        </div>

        {(message || error) && (
          <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-500/25 bg-red-500/10 text-red-500' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600'}`}>
            {error || message}
          </div>
        )}

        {spaceFormOpen && (
          <section className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-5">
            <h2 className="font-semibold text-[var(--color-text-primary)]">创建文档空间</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm text-[var(--color-text-secondary)]">名称<input value={spaceForm.name} onChange={(event) => setSpaceForm((current) => ({ ...current, name: event.target.value }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-[var(--color-text-primary)]" placeholder="Nowen Note" /></label>
              <label className="text-sm text-[var(--color-text-secondary)]">Slug<input value={spaceForm.slug ?? ''} onChange={(event) => setSpaceForm((current) => ({ ...current, slug: event.target.value }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-[var(--color-text-primary)]" placeholder="nowen-note" /></label>
              <label className="text-sm text-[var(--color-text-secondary)]">内容来源<select value={spaceForm.sourceMode} onChange={(event) => setSpaceForm((current) => ({ ...current, sourceMode: event.target.value as 'cms' | 'github' }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-[var(--color-text-primary)]"><option value="cms">后台 CMS</option><option value="github">GitHub 仓库同步</option></select></label>
              <label className="text-sm text-[var(--color-text-secondary)]">排序<input type="number" value={spaceForm.sortOrder ?? 0} onChange={(event) => setSpaceForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-[var(--color-text-primary)]" /></label>
              <label className="md:col-span-2 text-sm text-[var(--color-text-secondary)]">简介<input value={spaceForm.description ?? ''} onChange={(event) => setSpaceForm((current) => ({ ...current, description: event.target.value }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-[var(--color-text-primary)]" placeholder="项目安装、部署和使用文档" /></label>
              {spaceForm.sourceMode === 'github' && <><label className="text-sm text-[var(--color-text-secondary)]">GitHub 仓库<input value={spaceForm.repositoryFullName ?? ''} onChange={(event) => setSpaceForm((current) => ({ ...current, repositoryFullName: event.target.value }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 font-mono text-sm text-[var(--color-text-primary)]" placeholder="cropflre/nowen-note" /></label><label className="text-sm text-[var(--color-text-secondary)]">文档目录<input value={spaceForm.docsRoot ?? 'docs'} onChange={(event) => setSpaceForm((current) => ({ ...current, docsRoot: event.target.value }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 font-mono text-sm text-[var(--color-text-primary)]" placeholder="docs" /></label></>}
              <label className="flex items-end gap-2 pb-2 text-sm text-[var(--color-text-secondary)]"><input type="checkbox" checked={spaceForm.isPublished ?? true} onChange={(event) => setSpaceForm((current) => ({ ...current, isPublished: event.target.checked }))} /> 创建后公开</label>
            </div>
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setSpaceFormOpen(false)} className="nowen-button-secondary nowen-focus px-4 py-2 text-sm">取消</button><button type="button" onClick={() => createSpace.mutate(spaceForm)} disabled={createSpace.isPending || !spaceForm.name.trim()} className="nowen-button-primary nowen-focus inline-flex items-center gap-2 px-4 py-2 text-sm">{createSpace.isPending && <Loader2 className="h-4 w-4 animate-spin" />}创建</button></div>
          </section>
        )}

        <div className="mt-6 grid min-h-[720px] gap-5 xl:grid-cols-[260px_320px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-3">
            <div className="flex items-center justify-between px-2 py-2"><h2 className="text-sm font-semibold text-[var(--color-text-primary)]">项目空间</h2><span className="text-xs text-[var(--color-text-muted)]">{spacesQuery.data?.items.length ?? 0}</span></div>
            <div className="mt-2 space-y-2">
              {spacesQuery.isPending ? <p className="p-4 text-center text-sm text-[var(--color-text-muted)]">加载中…</p> : spacesQuery.data?.items.map((space) => <SpaceBadge key={space.id} space={space} selected={space.id === selectedSpaceId} onClick={() => { setSelectedSpaceId(space.id); setEditingId(null); setDocumentForm(EMPTY_DOCUMENT); }} />)}
            </div>
          </aside>

          <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-3">
            {selectedSpace ? (
              <>
                <div className="border-b border-[var(--color-border)] px-2 pb-4 pt-2">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-semibold text-[var(--color-text-primary)]">{selectedSpace.name}</h2><p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">/docs/{selectedSpace.slug}</p></div><button type="button" onClick={() => updateSpace.mutate({ id: selectedSpace.id, payload: { isPublished: !selectedSpace.isPublished } })} className="nowen-focus rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)]">{selectedSpace.isPublished ? '公开中' : '未公开'}</button></div>
                  {selectedSpace.repositoryFullName && <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]"><Github className="h-3.5 w-3.5" />{selectedSpace.repositoryFullName}</p>}
                  {selectedSpace.sourceMode === 'github' && <button type="button" onClick={() => syncSpace.mutate()} disabled={syncSpace.isPending || !selectedVersion} className="nowen-button-secondary nowen-focus mt-3 inline-flex w-full items-center justify-center gap-2 px-3 py-2 text-xs"><Github className="h-3.5 w-3.5" />{syncSpace.isPending ? '正在同步…' : `从 GitHub 同步 ${selectedVersion?.sourceRef || '默认分支'}`}</button>}
                </div>

                <div className="mt-3 flex items-center gap-2 px-2">
                  <select value={selectedVersionId} onChange={(event) => { setSelectedVersionId(event.target.value); setEditingId(null); setDocumentForm(EMPTY_DOCUMENT); }} className="nowen-focus h-10 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-sm">
                    {(selectedSpace.versions ?? []).map((version) => <option key={version.id} value={version.id}>{version.label}{version.isDefault ? ' · 默认' : ''}</option>)}
                  </select>
                  <button type="button" onClick={() => setVersionFormOpen((value) => !value)} className="nowen-focus flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)]" aria-label="新建版本"><Plus className="h-4 w-4" /></button>
                </div>

                {versionFormOpen && (
                  <div className="mx-2 mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                    <input value={versionForm.version} onChange={(event) => setVersionForm((current) => ({ ...current, version: event.target.value }))} placeholder="版本标识，如 v1.3" className="nowen-focus h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm" />
                    <input value={versionForm.label} onChange={(event) => setVersionForm((current) => ({ ...current, label: event.target.value }))} placeholder="显示名称，如 1.3 稳定版" className="nowen-focus mt-2 h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm" />
                    {selectedSpace.sourceMode === 'github' && <input value={versionForm.sourceRef ?? ''} onChange={(event) => setVersionForm((current) => ({ ...current, sourceRef: event.target.value }))} placeholder="Git 分支或 Tag，如 v1.3.0" className="nowen-focus mt-2 h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 font-mono text-xs" />}
                    <label className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]"><input type="checkbox" checked={versionForm.isDefault ?? false} onChange={(event) => setVersionForm((current) => ({ ...current, isDefault: event.target.checked }))} />设为默认版本</label>
                    <button type="button" onClick={() => createVersion.mutate({ spaceId: selectedSpace.id, payload: versionForm })} disabled={!versionForm.version.trim() || !versionForm.label.trim() || createVersion.isPending} className="nowen-button-primary nowen-focus mt-3 w-full px-3 py-2 text-sm">创建版本</button>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between px-2"><h3 className="text-sm font-semibold text-[var(--color-text-primary)]">文档目录</h3><button type="button" onClick={startNewDocument} className="nowen-focus inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-[var(--color-primary)] hover:bg-[var(--color-glass-hover)]"><FilePlus2 className="h-3.5 w-3.5" />新建</button></div>
                <div className="mt-2 max-h-[530px] space-y-1 overflow-y-auto px-1">
                  {documentsQuery.isPending ? <p className="p-4 text-center text-xs text-[var(--color-text-muted)]">加载文档…</p> : orderedDocuments.length ? orderedDocuments.map((document) => (
                    <button key={document.id} type="button" onClick={() => editDocument(document)} className={`nowen-focus flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${editingId === document.id ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-text-primary)]'}`} style={{ paddingLeft: `${10 + Math.min(document.depth, 5) * 14}px` }}>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{document.title}</span><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${document.status === 'published' ? 'bg-emerald-500' : document.status === 'archived' ? 'bg-slate-400' : 'bg-amber-500'}`} />
                    </button>
                  )) : <div className="p-6 text-center text-xs text-[var(--color-text-muted)]"><FilePlus2 className="mx-auto h-7 w-7" /><p className="mt-2">当前版本暂无文档</p></div>}
                </div>
              </>
            ) : <div className="flex h-full items-center justify-center p-8 text-center text-sm text-[var(--color-text-muted)]">请先创建或选择文档空间。</div>}
          </aside>

          <section className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)]">
            {selectedSpace && selectedVersion ? (
              <div className="flex h-full min-h-[720px] flex-col">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
                  <div><p className="text-sm font-semibold text-[var(--color-text-primary)]">{editingId ? '编辑文档' : '新建文档'}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{selectedSpace.name} / {selectedVersion.label}</p></div>
                  <div className="flex gap-2"><button type="button" onClick={() => setShowPreview((value) => !value)} className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-3 py-2 text-sm"><Eye className="h-4 w-4" />{showPreview ? '返回编辑' : '预览'}</button><button type="button" onClick={() => saveDocument.mutate()} disabled={saveDocument.isPending} className="nowen-button-primary nowen-focus inline-flex items-center gap-2 px-4 py-2 text-sm">{saveDocument.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}保存</button></div>
                </header>

                {showPreview ? (
                  <div className="flex-1 overflow-auto px-6 py-8 lg:px-10"><div className="mx-auto max-w-3xl"><div className="mb-8 border-b border-[var(--color-border)] pb-6"><p className="text-xs text-[var(--color-primary)]">预览 · {documentForm.status}</p><h1 className="mt-3 text-3xl font-semibold text-[var(--color-text-primary)]">{documentForm.title || '未命名文档'}</h1>{documentForm.description && <p className="mt-3 text-[var(--color-text-secondary)]">{documentForm.description}</p>}</div><Markdown content={normalizeDocsMarkdown(documentForm.contentMd)} /></div></div>
                ) : (
                  <div className="flex-1 overflow-auto p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-[var(--color-text-secondary)]">标题<input value={documentForm.title} onChange={(event) => setDocumentForm((current) => ({ ...current, title: event.target.value }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-[var(--color-text-primary)]" /></label>
                      <label className="text-sm text-[var(--color-text-secondary)]">文档路径<input value={documentForm.path} onChange={(event) => setDocumentForm((current) => ({ ...current, path: event.target.value }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 font-mono text-sm text-[var(--color-text-primary)]" placeholder="deployment/docker" /></label>
                      <label className="text-sm text-[var(--color-text-secondary)]">父级文档<select value={documentForm.parentId} onChange={(event) => setDocumentForm((current) => ({ ...current, parentId: event.target.value }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-[var(--color-text-primary)]"><option value="">无父级</option>{orderedDocuments.filter((item) => item.id !== editingId).map((item) => <option key={item.id} value={item.id}>{'— '.repeat(Math.min(item.depth, 4))}{item.title}</option>)}</select></label>
                      <div className="grid grid-cols-3 gap-2"><label className="text-sm text-[var(--color-text-secondary)]">状态<select value={documentForm.status} onChange={(event) => setDocumentForm((current) => ({ ...current, status: event.target.value as DocumentFormState['status'] }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 text-sm"><option value="draft">草稿</option><option value="published">发布</option><option value="archived">归档</option></select></label><label className="text-sm text-[var(--color-text-secondary)]">可见性<select value={documentForm.visibility} onChange={(event) => setDocumentForm((current) => ({ ...current, visibility: event.target.value as DocumentFormState['visibility'] }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 text-sm"><option value="public">公开</option><option value="private">私有</option></select></label><label className="text-sm text-[var(--color-text-secondary)]">排序<input type="number" value={documentForm.sortOrder} onChange={(event) => setDocumentForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 text-sm" /></label></div>
                      <label className="md:col-span-2 text-sm text-[var(--color-text-secondary)]">简介<input value={documentForm.description} onChange={(event) => setDocumentForm((current) => ({ ...current, description: event.target.value }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-[var(--color-text-primary)]" /></label>
                    </div>
                    <label className="mt-4 block text-sm text-[var(--color-text-secondary)]">Markdown 内容<textarea value={documentForm.contentMd} onChange={(event) => setDocumentForm((current) => ({ ...current, contentMd: event.target.value }))} className="nowen-focus mt-1.5 min-h-[360px] w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 font-mono text-sm leading-6 text-[var(--color-text-primary)]" spellCheck={false} /></label>
                    <details className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"><summary className="cursor-pointer text-sm font-medium text-[var(--color-text-primary)]">SEO 与 GitHub 编辑链接</summary><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm text-[var(--color-text-secondary)]">SEO 标题<input value={documentForm.seoTitle} onChange={(event) => setDocumentForm((current) => ({ ...current, seoTitle: event.target.value }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3" /></label><label className="text-sm text-[var(--color-text-secondary)]">GitHub 编辑地址<input value={documentForm.editUrl} onChange={(event) => setDocumentForm((current) => ({ ...current, editUrl: event.target.value }))} className="nowen-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3" /></label><label className="md:col-span-2 text-sm text-[var(--color-text-secondary)]">SEO 描述<textarea value={documentForm.seoDescription} onChange={(event) => setDocumentForm((current) => ({ ...current, seoDescription: event.target.value }))} className="nowen-focus mt-1.5 min-h-20 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3" /></label></div></details>
                    {editingId && <div className="mt-6 flex justify-between border-t border-[var(--color-border)] pt-5"><a href={`/docs/${selectedSpace.slug}/${selectedVersion.version}/${documentForm.path}`} target="_blank" rel="noreferrer" className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-3 py-2 text-sm"><Eye className="h-4 w-4" />查看前台</a><button type="button" onClick={() => { if (window.confirm('确认删除这篇文档？子文档将保留并移到根级。')) deleteDocument.mutate(editingId); }} className="nowen-focus inline-flex items-center gap-2 rounded-lg border border-red-500/25 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"><Trash2 className="h-4 w-4" />删除文档</button></div>}
                  </div>
                )}
              </div>
            ) : <div className="flex min-h-[720px] items-center justify-center p-8 text-center"><div><BookOpen className="mx-auto h-10 w-10 text-[var(--color-text-muted)]" /><p className="mt-4 text-sm text-[var(--color-text-secondary)]">选择文档空间和版本后开始编辑。</p></div></div>}
          </section>
        </div>
      </div>
    </div>
  );
}
