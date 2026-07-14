import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { helpCenterApi } from '../lib/helpCenterApi';
import { Seo } from '../components/seo/Seo';
import { api } from '../lib/api';

export function Projects() {
  const [query, setQuery] = useState('');
  const settings = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });
  const centers = useQuery({ queryKey: ['help-centers', 'projects'], queryFn: helpCenterApi.list });

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const items = centers.data?.items ?? [];
    if (!keyword) return items;
    return items.filter((item) =>
      [item.name, item.description ?? ''].join(' ').toLowerCase().includes(keyword),
    );
  }, [centers.data?.items, query]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <Seo
        title={`项目 - ${settings.data?.siteTitle ?? 'NOWEN Blog'}`}
        description="选择项目，查看安装、部署、功能使用和常见问题。"
      />

      <header className="border-b border-[var(--color-border)] pb-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]">
              <BookOpen className="h-4 w-4" />PROJECT HELP CENTERS
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">项目与帮助中心</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
              每个项目只有一个帮助中心。选择项目后即可查看安装、配置、功能说明和常见问题。
            </p>
          </div>
          <label className="relative block w-full lg:w-80">
            <span className="sr-only">搜索项目</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索项目"
              className="nowen-focus w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-glass)] py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
            />
          </label>
        </div>
      </header>

      {centers.isLoading ? (
        <div className="grid gap-6 py-10 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="nowen-skeleton aspect-[4/3] rounded-card" />)}
        </div>
      ) : centers.isError ? (
        <div className="mt-10 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-700 dark:text-amber-300">
          项目数据暂时无法读取，请稍后刷新。
        </div>
      ) : filtered.length === 0 ? (
        <div className="nowen-surface mt-10 border-dashed p-12 text-center text-[var(--color-text-muted)]">
          {query.trim() ? '没有找到匹配的项目。' : '后台创建帮助中心后，项目会自动显示在这里。'}
        </div>
      ) : (
        <div className="grid gap-6 py-10 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((center) => (
            <Link
              key={center.id}
              to={`/docs/${center.slug}`}
              className="group flex min-h-64 flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-6 transition hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--color-primary)_42%,var(--color-border))] hover:shadow-xl"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]"><BookOpen className="h-5 w-5" /></span>
                <span className="text-xs text-[var(--color-text-muted)]">{center.documentCount} 篇文档</span>
              </div>
              <h2 className="mt-6 text-xl font-semibold text-[var(--color-text-primary)]">{center.name}</h2>
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-[var(--color-text-secondary)]">{center.description || '查看项目的安装、配置与使用说明。'}</p>
              <p className="mt-auto inline-flex items-center gap-1 pt-6 text-sm font-medium text-[var(--color-primary)]">打开帮助中心 <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
