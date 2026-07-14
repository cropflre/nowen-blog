import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Bot,
  BookOpen,
  Check,
  ChevronRight,
  ExternalLink,
  Eye,
  FilePlus2,
  FolderPlus,
  Loader2,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  helpCenterApi,
  type AgentChange,
  type AgentRun,
  type AgentTask,
  type HelpCenter,
  type HelpCenterInput,
  type HelpDocumentInput,
} from '../../lib/helpCenterApi';
import type { DocumentItem } from '../../lib/docsApi';
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

const TASKS: Array<{ id: AgentTask; title: string; description: string; placeholder: string }> = [
  {
    id: 'create_help_center',
    title: '生成完整帮助中心',
    description: '自动规划两级目录并生成全部草稿',
    placeholder: '介绍项目的功能、目标用户、安装方式和需要重点说明的内容。',
  },
  {
    id: 'write_document',
    title: '写当前文档',
    description: '根据标题和已有内容补全新手教程',
    placeholder: '例如：面向完全不懂 Docker 的用户，写清楚每一步和成功后的现象。',
  },
  {
    id: 'audit_help_center',
    title: '检查并补齐文档',
    description: '找出缺失、重复和难懂的内容',
    placeholder: '例如：重点检查安装、第一次使用、备份和常见问题是否完整。',
  },
  {
    id: 'update_from_notes',
    title: '根据更新说明改文档',
    description: '粘贴版本变化，自动判断要新增或修改什么',
    placeholder: '粘贴本次更新内容，例如新增功能、入口变化、参数变化和已修复问题。',
  },
];

function formFromDocument(document: DocumentItem): DocumentFormState {
  return {
    title: document.title,
    parentId: document.parentId ?? '',
    description: document.description ?? '',
    contentMd: document.contentMd,
    status: document.status === 'published' ? 'published' : 'draft',
  };
}

function sortedItems(items: DocumentItem[]): DocumentItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'zh-CN'));
}

function statusText(status: AgentRun['status']): string {
  return {
    planning: '正在分析',
    generating: '正在生成',
    reviewing: '等待审核',
    completed: '已完成',
    failed: '生成失败',
    cancelled: '已放弃',
  }[status];
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
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{center.documentCount} 篇已公开</p>
        </div>
        <span className={`mt-1.5 h-2 w-2 rounded-full ${center.isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      </div>
    </button>
  );
}

function ChangeCard({
  change,
  checked,
  onToggle,
  onPreview,
}: {
  change: AgentChange;
  checked: boolean;
  onToggle: () => void;
  onPreview: () => void;
}) {
  return (
    <div className={`rounded-xl border p-3 ${change.status === 'applied' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]'}`}>
      <div className="flex items-start gap-2">
        {change.status === 'pending' ? (
          <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1" aria-label={`选择 ${change.title}`} />
        ) : (
          <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
        )}
        <button type="button" onClick={onPreview} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${change.action === 'create' ? 'bg-cyan-500/10 text-cyan-600' : 'bg-violet-500/10 text-violet-600'}`}>
              {change.action === 'create' ? '新增' : '更新'}
            </span>
            {change.parentTitle && <span className="text-[10px] text-[var(--color-text-muted)]">{change.parentTitle}</span>}
          </div>
          <p className="mt-1 truncate text-sm font-medium text-[var(--color-text-primary)]">{change.title}</p>
          {change.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-muted)]">{change.description}</p>}
        </button>
      </div>
    </div>
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
  const [centerForm, setCenterForm] = useState<HelpCenterInput>({ name: '', description: '', isPublished: true });
  const [settingsForm, setSettingsForm] = useState<HelpCenterInput>({ name: '', description: '', isPublished: true });
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [agentTask, setAgentTask] = useState<AgentTask>('create_help_center');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [selectedChanges, setSelectedChanges] = useState<string[]>([]);
  const [previewChange, setPreviewChange] = useState<AgentChange | null>(null);

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
  const agentRunsQuery = useQuery({
    queryKey: ['admin', 'help-centers', selectedCenterId, 'agent-runs'],
    queryFn: () => helpCenterApi.listAgentRuns(selectedCenterId),
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
      iconUrl: selectedCenter.iconUrl,
      isPublished: selectedCenter.isPublished,
      sortOrder: selectedCenter.sortOrder,
    });
    setCurrentRun(null);
    setSelectedChanges([]);
    setPreviewChange(null);
  }, [selectedCenter]);

  useEffect(() => {
    if (!currentRun) return;
    setSelectedChanges(currentRun.changes.filter((item) => item.status === 'pending').map((item) => item.id));
  }, [currentRun?.id, currentRun?.updatedAt]);

  const invalidateCenters = () => queryClient.invalidateQueries({ queryKey: ['admin', 'help-centers'] });
  const invalidateDocuments = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'help-centers', selectedCenterId, 'documents'] });
  const invalidateAgentRuns = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'help-centers', selectedCenterId, 'agent-runs'] });

  const createCenter = async (withAi: boolean) => {
    if (!centerForm.name.trim() || creating) return;
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const center = await helpCenterApi.create(centerForm);
      setSelectedCenterId(center.id);
      setCreateOpen(false);
      setCenterForm({ name: '', description: '', isPublished: true });
      await invalidateCenters();
      if (withAi) {
        const run = await helpCenterApi.createAgentRun(center.id, {
          task: 'create_help_center',
          prompt: center.description || `为 ${center.name} 生成面向新手的完整帮助中心。`,
        });
        setCurrentRun(run);
        setAgentTask('create_help_center');
        setMessage('帮助中心已创建，AI 已生成待审核草稿。');
      } else {
        setMessage('帮助中心已创建，并生成了“开始使用”草稿。');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建帮助中心失败');
    } finally {
      setCreating(false);
    }
  };

  const updateCenter = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<HelpCenterInput> }) => helpCenterApi.update(id, payload),
    onSuccess: () => {
      setMessage('项目设置已保存。');
      setError(null);
      setSettingsOpen(false);
      void invalidateCenters();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '保存项目设置失败'),
  });

  const removeCenter = useMutation({
    mutationFn: helpCenterApi.remove,
    onSuccess: () => {
      setSelectedCenterId('');
      setEditingId(null);
      setDocumentForm(EMPTY_DOCUMENT);
      setCurrentRun(null);
      setMessage('帮助中心已删除。');
      setError(null);
      void invalidateCenters();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '删除帮助中心失败'),
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
      setMessage('文档已删除，原有子文章会自动提升为一级页面。');
      setError(null);
      void invalidateDocuments();
      void invalidateCenters();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '删除文档失败'),
  });

  const reorderDocument = useMutation({
    mutationFn: async ({ document, direction }: { document: DocumentItem; direction: -1 | 1 }) => {
      const siblings = sortedItems((documentsQuery.data?.items ?? []).filter((item) => item.parentId === document.parentId));
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

  const runAgent = useMutation({
    mutationFn: async () => {
      if (!selectedCenter) throw new Error('请先选择项目');
      if (!agentPrompt.trim()) throw new Error('请告诉 AI 要写什么');
      return helpCenterApi.createAgentRun(selectedCenter.id, {
        task: agentTask,
        prompt: agentPrompt.trim(),
        documentId: agentTask === 'write_document' ? editingId : null,
      });
    },
    onSuccess: (run) => {
      setCurrentRun(run);
      setAgentPrompt('');
      setMessage('AI 已生成待审核变更，请检查后再应用。');
      setError(null);
      void invalidateAgentRuns();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : 'AI Agent 生成失败'),
  });

  const applyAgent = useMutation({
    mutationFn: async () => {
      if (!selectedCenter || !currentRun) throw new Error('没有可应用的 AI 任务');
      if (!selectedChanges.length) throw new Error('请至少选择一项变更');
      return helpCenterApi.applyAgentRun(selectedCenter.id, currentRun.id, selectedChanges);
    },
    onSuccess: (run) => {
      setCurrentRun(run);
      setMessage('所选 AI 变更已应用为草稿，请逐篇确认后发布。');
      setError(null);
      void invalidateDocuments();
      void invalidateCenters();
      void invalidateAgentRuns();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '应用 AI 变更失败'),
  });

  const cancelAgent = useMutation({
    mutationFn: async () => {
      if (!selectedCenter || !currentRun) throw new Error('没有可放弃的 AI 任务');
      return helpCenterApi.cancelAgentRun(selectedCenter.id, currentRun.id);
    },
    onSuccess: (run) => {
      setCurrentRun(run);
      setMessage('已放弃这次 AI 任务。');
      void invalidateAgentRuns();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '放弃任务失败'),
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

  const selectRun = async (id: string) => {
    if (!selectedCenter) return;
    try {
      setCurrentRun(await helpCenterApi.getAgentRun(selectedCenter.id, id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取 AI 任务失败');
    }
  };

  const currentTask = TASKS.find((item) => item.id === agentTask)!;
  const pendingChanges = currentRun?.changes.filter((item) => item.status === 'pending') ?? [];

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-[1900px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]"><BookOpen className="h-5 w-5" />帮助中心</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text-primary)]">描述项目，AI 帮你写文档</h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">一个项目一个帮助中心，目录最多两级。网址、排序、历史记录和 SEO 都由系统处理。</p>
          </div>
          <button type="button" onClick={() => setCreateOpen((value) => !value)} className="nowen-button-primary nowen-focus inline-flex items-center gap-2 px-4 py-2.5 text-sm"><FolderPlus className="h-4 w-4" />新建项目</button>
        </div>

        {(message || error) && (
          <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-500/25 bg-red-500/10 text-red-500' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600'}`}>
            {error || message}
          </div>
        )}

        {createOpen && (
          <section className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-5">
            <div><h2 className="font-semibold text-[var(--color-text-primary)]">创建项目帮助中心</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">只需要项目名称和一句介绍。可以先创建空白，也可以让 AI 直接生成完整草稿。</p></div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-[var(--color-text-secondary)]">项目名称<input value={centerForm.name} onChange={(event) => setCenterForm((current) => ({ ...current, name: event.target.value }))} placeholder="例如：Nowen Note" className="nowen-focus mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-[var(--color-text-primary)]" /></label>
              <label className="text-sm text-[var(--color-text-secondary)]">一句话说明<input value={centerForm.description ?? ''} onChange={(event) => setCenterForm((current) => ({ ...current, description: event.target.value }))} placeholder="功能、目标用户和主要使用场景" className="nowen-focus mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-[var(--color-text-primary)]" /></label>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="nowen-button-secondary nowen-focus px-4 py-2 text-sm">取消</button>
              <button type="button" onClick={() => void createCenter(false)} disabled={creating || !centerForm.name.trim()} className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50">{creating && <Loader2 className="h-4 w-4 animate-spin" />}创建空白</button>
              <button type="button" onClick={() => void createCenter(true)} disabled={creating || !centerForm.name.trim()} className="nowen-button-primary nowen-focus inline-flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-50"><Sparkles className="h-4 w-4" />创建并让 AI 写</button>
            </div>
          </section>
        )}

        <div className="mt-6 grid min-h-[760px] gap-4 2xl:grid-cols-[220px_300px_minmax(480px,1fr)_360px]">
          <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-3">
            <div className="flex items-center justify-between px-2 py-2"><h2 className="text-sm font-semibold text-[var(--color-text-primary)]">项目</h2><span className="text-xs text-[var(--color-text-muted)]">{centersQuery.data?.items.length ?? 0}</span></div>
            <div className="mt-2 space-y-2">{centersQuery.isPending ? <p className="p-4 text-center text-sm text-[var(--color-text-muted)]">加载中…</p> : centersQuery.data?.items.map((center) => <CenterButton key={center.id} center={center} active={center.id === selectedCenterId} onClick={() => { setSelectedCenterId(center.id); setEditingId(null); setDocumentForm(EMPTY_DOCUMENT); setSettingsOpen(false); }} />)}</div>
          </aside>

          <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-3">
            {selectedCenter ? (
              <>
                <div className="border-b border-[var(--color-border)] px-2 pb-4 pt-2">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-semibold text-[var(--color-text-primary)]">{selectedCenter.name} 帮助中心</h2><p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{selectedCenter.description || '暂未填写项目介绍'}</p></div><button type="button" onClick={() => setSettingsOpen((value) => !value)} className="nowen-focus flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)]" aria-label="项目设置"><Settings2 className="h-4 w-4" /></button></div>
                  <a href={`/docs/${selectedCenter.slug}`} target="_blank" rel="noreferrer" className="nowen-button-secondary nowen-focus mt-3 inline-flex w-full items-center justify-center gap-2 px-3 py-2 text-xs"><ExternalLink className="h-3.5 w-3.5" />查看前台</a>
                </div>

                {settingsOpen && (
                  <div className="mx-1 mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                    <input value={settingsForm.name ?? ''} onChange={(event) => setSettingsForm((current) => ({ ...current, name: event.target.value }))} className="nowen-focus h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm" placeholder="项目名称" />
                    <input value={settingsForm.description ?? ''} onChange={(event) => setSettingsForm((current) => ({ ...current, description: event.target.value }))} className="nowen-focus mt-2 h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm" placeholder="项目简介" />
                    <label className="mt-3 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]"><input type="checkbox" checked={settingsForm.isPublished ?? true} onChange={(event) => setSettingsForm((current) => ({ ...current, isPublished: event.target.checked }))} />公开帮助中心</label>
                    <button type="button" onClick={() => updateCenter.mutate({ id: selectedCenter.id, payload: settingsForm })} className="nowen-button-primary nowen-focus mt-3 w-full px-3 py-2 text-sm">保存设置</button>
                    <button type="button" onClick={() => { if (window.confirm(`确定删除“${selectedCenter.name}”吗？所有帮助文档都会被删除。`)) removeCenter.mutate(selectedCenter.id); }} className="nowen-focus mt-2 w-full rounded-lg px-3 py-2 text-xs text-red-500 hover:bg-red-500/10"><Trash2 className="mr-1 inline h-3.5 w-3.5" />删除项目</button>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between px-2"><div><h3 className="text-sm font-semibold text-[var(--color-text-primary)]">目录</h3><p className="mt-1 text-[11px] text-[var(--color-text-muted)]">一级栏目 + 二级文章</p></div><button type="button" onClick={() => startNew()} className="nowen-focus inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-[var(--color-primary)] hover:bg-[var(--color-glass-hover)]"><FilePlus2 className="h-3.5 w-3.5" />新建一级</button></div>
                <div className="mt-2 max-h-[610px] space-y-2 overflow-y-auto px-1">
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
            ) : <div className="flex h-full items-center justify-center p-8 text-center text-sm text-[var(--color-text-muted)]">先创建一个项目。</div>}
          </aside>

          <section className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)]">
            {selectedCenter ? (
              <div className="flex h-full min-h-[760px] flex-col">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4"><div><p className="text-sm font-semibold text-[var(--color-text-primary)]">{editingId ? '编辑帮助文档' : '新建帮助文档'}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{documentForm.parentId ? '二级文章' : '一级栏目或页面'} · 系统自动生成网址</p></div><div className="flex gap-2"><button type="button" onClick={() => setShowPreview((value) => !value)} className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-3 py-2 text-sm"><Eye className="h-4 w-4" />{showPreview ? '继续编辑' : '预览'}</button><button type="button" onClick={() => saveDocument.mutate()} disabled={saveDocument.isPending} className="nowen-button-primary nowen-focus inline-flex items-center gap-2 px-4 py-2 text-sm">{saveDocument.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}保存</button></div></header>

                {showPreview ? (
                  <div className="flex-1 overflow-y-auto p-6"><article className="mx-auto max-w-3xl"><h1 className="text-3xl font-semibold">{documentForm.title || '未命名文档'}</h1>{documentForm.description && <p className="mt-3 text-[var(--color-text-secondary)]">{documentForm.description}</p>}<div className="mt-8"><Markdown content={normalizeDocsMarkdown(documentForm.contentMd)} /></div></article></div>
                ) : (
                  <div className="flex-1 space-y-4 overflow-y-auto p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-[var(--color-text-secondary)]">标题<input value={documentForm.title} onChange={(event) => setDocumentForm((current) => ({ ...current, title: event.target.value }))} placeholder="例如：Docker 部署" className="nowen-focus mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-[var(--color-text-primary)]" /></label>
                      <label className="text-sm text-[var(--color-text-secondary)]">放在哪个栏目<select value={documentForm.parentId} onChange={(event) => setDocumentForm((current) => ({ ...current, parentId: event.target.value }))} className="nowen-focus mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3"><option value="">一级栏目或页面</option>{rootOptions.map((root) => <option key={root.id} value={root.id}>{root.title}</option>)}</select></label>
                    </div>
                    <label className="block text-sm text-[var(--color-text-secondary)]">一句话说明<input value={documentForm.description} onChange={(event) => setDocumentForm((current) => ({ ...current, description: event.target.value }))} placeholder="告诉用户这篇文档能解决什么问题" className="nowen-focus mt-1.5 h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3" /></label>
                    <label className="block text-sm text-[var(--color-text-secondary)]">文档内容<textarea value={documentForm.contentMd} onChange={(event) => setDocumentForm((current) => ({ ...current, contentMd: event.target.value }))} rows={22} className="nowen-focus mt-1.5 w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 font-mono text-sm leading-7" /></label>
                    <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]"><input type="checkbox" checked={documentForm.status === 'published'} onChange={(event) => setDocumentForm((current) => ({ ...current, status: event.target.checked ? 'published' : 'draft' }))} />保存后立即公开</label>
                    {editingId && <button type="button" onClick={() => { if (window.confirm('确定删除这篇文档吗？')) deleteDocument.mutate(editingId); }} className="rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"><Trash2 className="mr-1 inline h-4 w-4" />删除文档</button>}
                  </div>
                )}
              </div>
            ) : <div className="flex min-h-[760px] items-center justify-center text-sm text-[var(--color-text-muted)]">创建项目后即可开始写文档。</div>}
          </section>

          <aside className="rounded-2xl border border-violet-500/20 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-bg-secondary)_96%,transparent),color-mix(in_srgb,var(--color-primary)_4%,var(--color-bg-secondary)))] p-4">
            <div className="flex items-start gap-3"><span className="rounded-xl bg-violet-500/10 p-2.5 text-violet-500"><Bot className="h-5 w-5" /></span><div><h2 className="font-semibold text-[var(--color-text-primary)]">AI 文档 Agent</h2><p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">AI 只生成待审核草稿，不会自动发布。</p></div></div>

            {selectedCenter ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {TASKS.map((task) => <button key={task.id} type="button" onClick={() => setAgentTask(task.id)} className={`nowen-focus rounded-xl border p-2.5 text-left ${agentTask === task.id ? 'border-violet-500/40 bg-violet-500/10' : 'border-[var(--color-border)] hover:bg-[var(--color-glass-hover)]'}`}><span className="block text-xs font-medium text-[var(--color-text-primary)]">{task.title}</span><span className="mt-1 block text-[10px] leading-4 text-[var(--color-text-muted)]">{task.description}</span></button>)}
                </div>
                <textarea value={agentPrompt} onChange={(event) => setAgentPrompt(event.target.value)} rows={5} placeholder={currentTask.placeholder} className="nowen-focus mt-3 w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm leading-6" />
                <button type="button" onClick={() => runAgent.mutate()} disabled={runAgent.isPending || !agentPrompt.trim() || (agentTask === 'write_document' && !editingId)} className="nowen-button-primary nowen-focus mt-3 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50">{runAgent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}开始生成</button>
                {agentTask === 'write_document' && !editingId && <p className="mt-2 text-center text-[11px] text-amber-600">先在左侧选择一篇文档</p>}
                <Link to="/admin/ai" className="mt-2 block text-center text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">模型与 API 设置</Link>

                {currentRun && (
                  <div className="mt-5 border-t border-[var(--color-border)] pt-4">
                    <div className="flex items-center justify-between gap-2"><div><p className="text-sm font-semibold text-[var(--color-text-primary)]">{statusText(currentRun.status)}</p><p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{new Date(currentRun.createdAt).toLocaleString('zh-CN')}</p></div><span className={`rounded-full px-2 py-1 text-[10px] ${currentRun.status === 'failed' ? 'bg-red-500/10 text-red-500' : currentRun.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-violet-500/10 text-violet-600'}`}>{currentRun.status}</span></div>
                    {currentRun.summary && <p className="mt-3 rounded-xl bg-[var(--color-bg-primary)] p-3 text-xs leading-5 text-[var(--color-text-secondary)]">{currentRun.summary}</p>}
                    {currentRun.error && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-500">{currentRun.error}</p>}
                    <div className="mt-3 space-y-2">{currentRun.steps.map((step) => <div key={step.id} className="flex items-start gap-2 text-xs"><span className={`mt-1 h-2 w-2 rounded-full ${step.status === 'completed' ? 'bg-emerald-500' : step.status === 'failed' ? 'bg-red-500' : step.status === 'running' ? 'animate-pulse bg-violet-500' : 'bg-[var(--color-border)]'}`} /><div><p className="text-[var(--color-text-primary)]">{step.title}</p>{step.detail && <p className="mt-0.5 text-[10px] leading-4 text-[var(--color-text-muted)]">{step.detail}</p>}</div></div>)}</div>

                    {currentRun.changes.length > 0 && <div className="mt-4 space-y-2">{currentRun.changes.map((change) => <ChangeCard key={change.id} change={change} checked={selectedChanges.includes(change.id)} onToggle={() => setSelectedChanges((current) => current.includes(change.id) ? current.filter((id) => id !== change.id) : [...current, change.id])} onPreview={() => setPreviewChange(change)} />)}</div>}

                    {pendingChanges.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => cancelAgent.mutate()} disabled={cancelAgent.isPending} className="nowen-button-secondary nowen-focus px-3 py-2 text-xs">放弃任务</button><button type="button" onClick={() => applyAgent.mutate()} disabled={applyAgent.isPending || !selectedChanges.length} className="nowen-button-primary nowen-focus inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs disabled:opacity-50">{applyAgent.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}应用所选</button></div>}
                  </div>
                )}

                {!currentRun && (agentRunsQuery.data?.items.length ?? 0) > 0 && <div className="mt-5 border-t border-[var(--color-border)] pt-4"><p className="text-xs font-semibold text-[var(--color-text-primary)]">最近任务</p><div className="mt-2 space-y-1">{agentRunsQuery.data?.items.slice(0, 5).map((run) => <button key={run.id} type="button" onClick={() => void selectRun(run.id)} className="nowen-focus flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs hover:bg-[var(--color-glass-hover)]"><span className="truncate">{TASKS.find((item) => item.id === run.task)?.title ?? 'AI 任务'}</span><ChevronRight className="h-3.5 w-3.5" /></button>)}</div></div>}
              </>
            ) : <p className="mt-8 text-center text-sm text-[var(--color-text-muted)]">创建项目后即可使用 AI。</p>}
          </aside>
        </div>
      </div>

      {previewChange && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button type="button" aria-label="关闭预览" onClick={() => setPreviewChange(null)} className="absolute inset-0 bg-black/60" />
          <section className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4"><div><p className="text-xs text-[var(--color-text-muted)]">{previewChange.action === 'create' ? '新增草稿' : '更新草稿'}{previewChange.parentTitle ? ` · ${previewChange.parentTitle}` : ''}</p><h2 className="mt-1 text-xl font-semibold">{previewChange.title}</h2></div><button type="button" onClick={() => setPreviewChange(null)} className="nowen-icon-button nowen-focus flex h-10 w-10 items-center justify-center"><X className="h-4 w-4" /></button></header>
            <div className="flex-1 overflow-y-auto p-6"><Markdown content={normalizeDocsMarkdown(previewChange.contentMd)} /></div>
          </section>
        </div>
      )}
    </div>
  );
}
