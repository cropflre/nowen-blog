import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  ExternalLink,
  FolderGit2,
  Github,
  Loader2,
  MapPin,
  Search,
  Users,
} from 'lucide-react';
import type { Project } from '@blog/shared';
import { projectsApi } from '../lib/blog19Api';
import {
  fetchGitHubShowcase,
  parseGitHubAccount,
  tryParseGitHubAccount,
} from '../lib/githubShowcase';
import { ProjectCard } from '../components/project/ProjectCard';
import { Seo } from '../components/seo/Seo';
import { api } from '../lib/api';

function repositoryKey(project: Project): string | null {
  if (project.githubFullName) return project.githubFullName.toLowerCase();
  if (!project.repositoryUrl) return null;
  return project.repositoryUrl.replace(/\.git$/i, '').replace(/\/+$/, '').toLowerCase();
}

export function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTarget = searchParams.get('github');
  const [query, setQuery] = useState('');
  const [accountInput, setAccountInput] = useState(urlTarget ?? '');
  const [accountTouched, setAccountTouched] = useState(Boolean(urlTarget));
  const [accountError, setAccountError] = useState<string | null>(null);

  const settings = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });
  const managedProjects = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.listPublic(100) });

  const configuredAccount = useMemo(
    () => tryParseGitHubAccount(settings.data?.social.github),
    [settings.data?.social.github],
  );
  const urlAccount = useMemo(() => tryParseGitHubAccount(urlTarget), [urlTarget]);
  const hasUrlTarget = urlTarget !== null;
  const activeAccount = hasUrlTarget ? urlAccount : configuredAccount;

  useEffect(() => {
    if (!accountTouched && configuredAccount) setAccountInput(configuredAccount);
  }, [accountTouched, configuredAccount]);

  useEffect(() => {
    if (urlTarget && !urlAccount) setAccountError('GitHub 账号参数无效，请重新输入用户名或主页地址');
  }, [urlAccount, urlTarget]);

  const github = useQuery({
    queryKey: ['github-public-showcase', activeAccount],
    queryFn: ({ signal }) => fetchGitHubShowcase(activeAccount!, signal),
    enabled: Boolean(activeAccount),
    staleTime: 15 * 60 * 1000,
    retry: false,
  });

  const allProjects = useMemo(() => {
    const managed = managedProjects.data?.items ?? [];
    const managedKeys = new Set(managed.map(repositoryKey).filter((value): value is string => Boolean(value)));
    const fromGitHub = (github.data?.projects ?? []).filter((project) => {
      const key = repositoryKey(project);
      return !key || !managedKeys.has(key);
    });
    return [...managed, ...fromGitHub];
  }, [github.data?.projects, managedProjects.data?.items]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return allProjects;
    return allProjects.filter((project) =>
      [project.name, project.description ?? '', project.language ?? '', ...project.topics]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [allProjects, query]);

  const submitAccount = (event: React.FormEvent) => {
    event.preventDefault();
    setAccountTouched(true);
    setAccountError(null);
    try {
      const account = parseGitHubAccount(accountInput);
      setAccountInput(account);
      if (hasUrlTarget && account === urlAccount) {
        void github.refetch();
        return;
      }
      const next = new URLSearchParams(searchParams);
      next.set('github', account);
      setSearchParams(next);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'GitHub 账号格式不正确');
    }
  };

  const isLoading = managedProjects.isLoading || (Boolean(activeAccount) && github.isLoading);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <Seo
        title={`项目 - ${settings.data?.siteTitle ?? 'NOWEN Blog'}`}
        description="开源项目、产品实践与持续构建中的作品集。"
      />

      <header className="border-b border-[var(--color-border)] pb-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]">
              <FolderGit2 className="h-4 w-4" />PROJECTS
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">项目与作品</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
              输入 GitHub 用户名或主页地址，即可公开展示该账号拥有的项目，无需登录，也不会写入数据库。
            </p>
          </div>
          <label className="relative block w-full lg:w-80">
            <span className="sr-only">搜索项目、语言或技术</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索项目、语言或技术"
              className="nowen-focus w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-glass)] py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
            />
          </label>
        </div>

        <form onSubmit={submitAccount} className="nowen-surface mt-8 p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="min-w-0 flex-1 text-sm font-medium text-[var(--color-text-secondary)]">
              GitHub 账号或主页
              <div className="relative mt-2">
                <Github className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  value={accountInput}
                  onChange={(event) => {
                    setAccountInput(event.target.value);
                    setAccountTouched(true);
                    setAccountError(null);
                  }}
                  placeholder="cropflre 或 https://github.com/cropflre/"
                  autoComplete="off"
                  className="nowen-focus w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-bg-tertiary)] py-3 pl-10 pr-4 text-sm outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={!accountInput.trim() || github.isFetching}
              className="nowen-button-primary nowen-focus inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {github.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
              {github.isFetching ? '读取中…' : '一键展示项目'}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
            直接由当前浏览器读取 GitHub 公开 API，仅展示该用户拥有的公开、未归档且非 Fork 仓库。
          </p>
          {accountError && <p className="mt-3 text-sm text-red-500" role="alert">{accountError}</p>}
        </form>
      </header>

      {github.data && (
        <section className="nowen-surface mt-8 p-5 sm:p-6" aria-label="GitHub 公开资料">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <img
              src={github.data.profile.avatarUrl}
              alt={`${github.data.profile.login} 的 GitHub 头像`}
              className="h-20 w-20 rounded-2xl border border-[var(--color-glass-border)] object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  {github.data.profile.name || github.data.profile.login}
                </h2>
                <span className="font-mono text-sm text-[var(--color-text-muted)]">@{github.data.profile.login}</span>
              </div>
              {github.data.profile.bio && (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">{github.data.profile.bio}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-1"><FolderGit2 className="h-3.5 w-3.5" />{github.data.projects.length} 个展示项目</span>
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{github.data.profile.followers} 位关注者</span>
                {github.data.profile.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{github.data.profile.location}</span>}
              </div>
            </div>
            <a
              href={github.data.profile.profileUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="nowen-button-secondary nowen-focus inline-flex min-h-11 shrink-0 items-center justify-center gap-2 px-4 text-sm font-medium"
            >
              查看 GitHub 主页<ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </section>
      )}

      {github.isError && (
        <div className="mt-8 rounded-card border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-6 text-amber-700 dark:text-amber-300" role="status">
          GitHub 项目暂时无法读取：{github.error instanceof Error ? github.error.message : '未知错误'}。后台手动维护的项目仍会继续展示。
        </div>
      )}
      {managedProjects.isError && (
        <div className="mt-8 rounded-card border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-700 dark:text-amber-300" role="status">
          本站项目数据暂时无法读取，当前仅展示 GitHub 公开项目。
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-6 py-10 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="nowen-skeleton aspect-[4/3] rounded-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="nowen-surface mt-10 border-dashed p-12 text-center text-[var(--color-text-muted)]">
          {activeAccount ? '没有找到匹配的公开项目。' : '请输入 GitHub 账号，或在系统设置中配置 GitHub 主页。'}
        </div>
      ) : (
        <div className="grid gap-6 py-10 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => <ProjectCard key={project.id} project={project} />)}
        </div>
      )}
    </div>
  );
}
