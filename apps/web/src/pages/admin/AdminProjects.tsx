import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FolderGit2, Github, Loader2, Pencil, RefreshCw, Save, Star, Trash2 } from 'lucide-react';
import type { Project } from '@blog/shared';
import type { ProjectInput } from '../../blog19';
import { projectsApi } from '../../lib/blog19Api';

const inputClass = 'w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-brand/70';

const EMPTY_FORM: ProjectInput = {
  name: '',
  slug: '',
  description: null,
  coverUrl: null,
  repositoryUrl: null,
  homepageUrl: null,
  language: null,
  topics: [],
  isFeatured: false,
  isPublished: true,
  sortOrder: 0,
};

function projectToForm(project: Project): ProjectInput {
  return {
    name: project.name,
    slug: project.slug,
    description: project.description,
    coverUrl: project.coverUrl,
    repositoryUrl: project.repositoryUrl,
    homepageUrl: project.homepageUrl,
    language: project.language,
    topics: project.topics,
    isFeatured: project.isFeatured,
    isPublished: project.isPublished,
    sortOrder: project.sortOrder,
  };
}

export function AdminProjects() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'projects'], queryFn: projectsApi.listAdmin });
  const [form, setForm] = useState<ProjectInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncTarget, setSyncTarget] = useState('');
  const [maxRepos, setMaxRepos] = useState(12);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = query.data?.items ?? [];
  const stats = useMemo(() => ({
    total: items.length,
    published: items.filter((item) => item.isPublished).length,
    featured: items.filter((item) => item.isFeatured).length,
    github: items.filter((item) => item.source === 'github').length,
  }), [items]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
    await queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending('save');
    setError(null);
    setMessage(null);
    try {
      if (editingId) await projectsApi.update(editingId, form);
      else await projectsApi.create(form);
      setMessage(editingId ? '项目已更新。' : '项目已创建。');
      setEditingId(null);
      setForm(EMPTY_FORM);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败');
    } finally {
      setPending(null);
    }
  };

  const sync = async () => {
    if (!syncTarget.trim() || pending) return;
    setPending('sync');
    setError(null);
    setMessage(null);
    try {
      const result = await projectsApi.syncTarget(syncTarget, maxRepos);
      setMessage(`已从 GitHub 同步 ${result.synced} 个项目。`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '同步失败');
    } finally {
      setPending(null);
    }
  };

  const act = async (key: string, action: () => Promise<unknown>, success: string) => {
    if (pending) return;
    setPending(key);
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(success);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header>
        <div className="flex items-center gap-2"><FolderGit2 className="h-6 w-6 text-brand" /><h1 className="text-2xl font-bold">项目管理</h1></div>
        <p className="mt-2 text-sm text-muted">维护作品集，或从 GitHub 用户和仓库地址同步项目元数据。</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['项目总数', stats.total],
          ['前台展示', stats.published],
          ['精选项目', stats.featured],
          ['GitHub 同步', stats.github],
        ].map(([label, value]) => <div key={String(label)} className="rounded-card border border-line bg-surface p-4"><p className="text-xs text-muted">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}
      </div>

      {message && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">{message}</div>}
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}

      <section className="rounded-card border border-line bg-surface p-5 lg:p-6">
        <div className="flex items-center gap-2"><Github className="h-5 w-5 text-brand" /><h2 className="font-semibold">GitHub 同步</h2></div>
        <p className="mt-1 text-sm text-muted">输入 GitHub 用户名可导入最近更新的非 Fork 仓库；也可输入 owner/repo 或完整仓库地址。</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
          <input className={inputClass} value={syncTarget} onChange={(event) => setSyncTarget(event.target.value)} placeholder="cropflre 或 cropflre/nowen-note" />
          <input type="number" min={1} max={30} className={inputClass} value={maxRepos} onChange={(event) => setMaxRepos(Number(event.target.value) || 12)} aria-label="最大同步数量" />
          <button type="button" onClick={() => void sync()} disabled={pending === 'sync'} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {pending === 'sync' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}同步
          </button>
        </div>
      </section>

      <form onSubmit={save} className="rounded-card border border-line bg-surface p-5 lg:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{editingId ? '编辑项目' : '手动新增项目'}</h2>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }} className="text-sm text-muted hover:text-fg">取消编辑</button>}</div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="text-sm">项目名称<input required className={`${inputClass} mt-2`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="text-sm">Slug<input className={`${inputClass} mt-2`} value={form.slug ?? ''} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="留空自动生成" /></label>
          <label className="text-sm lg:col-span-2">项目描述<textarea className={`${inputClass} mt-2 min-h-24 resize-y`} value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value || null })} /></label>
          <label className="text-sm">仓库地址<input className={`${inputClass} mt-2`} value={form.repositoryUrl ?? ''} onChange={(event) => setForm({ ...form, repositoryUrl: event.target.value || null })} /></label>
          <label className="text-sm">产品地址<input className={`${inputClass} mt-2`} value={form.homepageUrl ?? ''} onChange={(event) => setForm({ ...form, homepageUrl: event.target.value || null })} /></label>
          <label className="text-sm">封面地址<input className={`${inputClass} mt-2`} value={form.coverUrl ?? ''} onChange={(event) => setForm({ ...form, coverUrl: event.target.value || null })} placeholder="/uploads/project-cover.webp" /></label>
          <label className="text-sm">主要语言<input className={`${inputClass} mt-2`} value={form.language ?? ''} onChange={(event) => setForm({ ...form, language: event.target.value || null })} /></label>
          <label className="text-sm lg:col-span-2">Topics<input className={`${inputClass} mt-2`} value={(form.topics ?? []).join(', ')} onChange={(event) => setForm({ ...form, topics: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="react, typescript, electron" /></label>
          <label className="text-sm">排序值<input type="number" className={`${inputClass} mt-2`} value={form.sortOrder ?? 0} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) || 0 })} /></label>
          <div className="flex flex-wrap items-end gap-4 pb-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(form.isFeatured)} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} />精选项目</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isPublished !== false} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} />前台展示</label>
          </div>
        </div>
        <button type="submit" disabled={pending === 'save'} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {pending === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editingId ? '保存修改' : '创建项目'}
        </button>
      </form>

      <section className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="border-b border-line px-5 py-4"><h2 className="font-semibold">全部项目</h2></div>
        {query.isLoading ? <div className="p-10 text-center text-muted">正在加载项目…</div> : items.length === 0 ? <div className="p-10 text-center text-muted">暂无项目，可手动创建或从 GitHub 同步。</div> : (
          <div className="divide-y divide-line">
            {items.map((project) => (
              <div key={project.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{project.name}</h3>{project.isFeatured && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">精选</span>}{!project.isPublished && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500">隐藏</span>}</div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted">{project.description || '暂无描述'}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted"><span>{project.source === 'github' ? project.githubFullName : '手动项目'}</span>{project.source === 'github' && <><span className="inline-flex items-center gap-1"><Star className="h-3 w-3" />{project.stars}</span><span>Fork {project.forks}</span></>}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(project.homepageUrl || project.repositoryUrl) && <a href={project.homepageUrl || project.repositoryUrl || '#'} target="_blank" rel="noreferrer noopener" className="rounded-lg border border-line p-2 text-muted hover:text-fg"><ExternalLink className="h-4 w-4" /></a>}
                  <button type="button" onClick={() => { setEditingId(project.id); setForm(projectToForm(project)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs"><Pencil className="h-3.5 w-3.5" />编辑</button>
                  {project.source === 'github' && <button type="button" onClick={() => void act(`sync-${project.id}`, () => projectsApi.syncProject(project.id), 'GitHub 数据已刷新。')} disabled={pending === `sync-${project.id}`} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs"><RefreshCw className={`h-3.5 w-3.5 ${pending === `sync-${project.id}` ? 'animate-spin' : ''}`} />刷新</button>}
                  <button type="button" onClick={() => void act(`feature-${project.id}`, () => projectsApi.update(project.id, { isFeatured: !project.isFeatured }), project.isFeatured ? '已取消精选。' : '已设为精选。')} className="rounded-lg border border-line px-3 py-2 text-xs">{project.isFeatured ? '取消精选' : '设为精选'}</button>
                  <button type="button" onClick={() => void act(`publish-${project.id}`, () => projectsApi.update(project.id, { isPublished: !project.isPublished }), project.isPublished ? '已从前台隐藏。' : '已恢复前台展示。')} className="rounded-lg border border-line px-3 py-2 text-xs">{project.isPublished ? '隐藏' : '展示'}</button>
                  <button type="button" onClick={() => { if (window.confirm(`确定删除项目“${project.name}”吗？`)) void act(`delete-${project.id}`, () => projectsApi.remove(project.id), '项目已删除。'); }} className="rounded-lg border border-red-500/30 p-2 text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
