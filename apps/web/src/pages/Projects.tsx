import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderGit2, Search } from 'lucide-react';
import { projectsApi } from '../lib/blog19Api';
import { ProjectCard } from '../components/project/ProjectCard';
import { Seo } from '../components/seo/Seo';
import { api } from '../lib/api';

export function Projects() {
  const [query, setQuery] = useState('');
  const settings = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });
  const projects = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.listPublic(100) });

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return projects.data?.items ?? [];
    return (projects.data?.items ?? []).filter((project) =>
      [project.name, project.description ?? '', project.language ?? '', ...project.topics]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [projects.data?.items, query]);

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12 md:py-16">
      <Seo
        title={`项目 - ${settings.data?.siteTitle ?? 'NOWEN Blog'}`}
        description="开源项目、产品实践与持续构建中的作品集。"
      />

      <header className="flex flex-col gap-6 border-b border-line pb-10 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-brand"><FolderGit2 className="h-4 w-4" />PROJECTS</div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">项目与作品</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted">记录已经发布、持续维护和正在探索的产品与工程项目。</p>
        </div>
        <label className="relative block w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索项目、语言或技术"
            className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-4 text-sm outline-none transition focus:border-brand/70"
          />
        </label>
      </header>

      {projects.isLoading ? (
        <div className="grid gap-6 py-10 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-[4/3] animate-pulse rounded-card border border-line bg-surface" />)}
        </div>
      ) : projects.isError ? (
        <div className="mt-10 rounded-card border border-red-500/30 bg-red-500/10 p-8 text-center text-red-500">项目加载失败，请稍后重试。</div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-card border border-dashed border-line p-12 text-center text-muted">没有找到匹配的项目。</div>
      ) : (
        <div className="grid gap-6 py-10 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => <ProjectCard key={project.id} project={project} />)}
        </div>
      )}
    </div>
  );
}
