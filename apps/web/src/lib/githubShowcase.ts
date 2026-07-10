import type { Project } from '@blog/shared';

interface GitHubUserResponse {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  html_url: string;
  blog: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

interface GitHubRepositoryResponse {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  pushed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GitHubPublicProfile {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  profileUrl: string;
  websiteUrl: string | null;
  location: string | null;
  publicRepos: number;
  followers: number;
  following: number;
}

export interface GitHubShowcaseResult {
  account: string;
  profile: GitHubPublicProfile;
  projects: Project[];
}

export function parseGitHubAccount(input: string): string {
  let value = input.trim().replace(/^@/, '');
  if (!value) throw new Error('请输入 GitHub 用户名或主页地址');

  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
      throw new Error('仅支持 github.com 用户主页');
    }
    value = url.pathname.replace(/^\/+|\/+$/g, '');
  }

  const parts = value.split('/').filter(Boolean);
  if (parts.length !== 1) throw new Error('请输入 GitHub 用户名或用户主页，不要填写仓库地址');
  const account = parts[0];
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(account)) {
    throw new Error('GitHub 用户名格式不正确');
  }
  return account;
}

export function tryParseGitHubAccount(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  try {
    return parseGitHubAccount(input);
  } catch {
    return null;
  }
}

async function githubJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { message?: string };
      detail = body.message ? `：${body.message}` : '';
    } catch {
      detail = '';
    }

    if (response.status === 404) throw new Error('没有找到这个 GitHub 用户');
    if (response.status === 403 || response.status === 429) {
      const reset = Number(response.headers.get('x-ratelimit-reset'));
      const resetText = Number.isFinite(reset)
        ? `，预计 ${new Date(reset * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 恢复`
        : '';
      throw new Error(`当前访问者的 GitHub 匿名额度已用尽${resetText}${detail}`);
    }
    throw new Error(`GitHub 公开数据读取失败 (${response.status})${detail}`);
  }

  return (await response.json()) as T;
}

function toProject(repo: GitHubRepositoryResponse): Project {
  return {
    id: `github-${repo.id}`,
    name: repo.name,
    slug: repo.name.toLowerCase(),
    description: repo.description,
    coverUrl: null,
    repositoryUrl: repo.html_url,
    homepageUrl: repo.homepage?.trim() || null,
    language: repo.language,
    topics: repo.topics ?? [],
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    source: 'github',
    githubFullName: repo.full_name,
    githubPushedAt: repo.pushed_at,
    syncedAt: null,
    isFeatured: false,
    isPublished: true,
    sortOrder: 0,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
  };
}

export async function fetchGitHubShowcase(target: string, signal?: AbortSignal): Promise<GitHubShowcaseResult> {
  const account = parseGitHubAccount(target);
  const encoded = encodeURIComponent(account);
  const [profile, repositories] = await Promise.all([
    githubJson<GitHubUserResponse>(`https://api.github.com/users/${encoded}`, signal),
    githubJson<GitHubRepositoryResponse[]>(
      `https://api.github.com/users/${encoded}/repos?type=owner&sort=updated&direction=desc&per_page=100`,
      signal,
    ),
  ]);

  return {
    account,
    profile: {
      login: profile.login,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      profileUrl: profile.html_url,
      websiteUrl: profile.blog?.trim() || null,
      location: profile.location,
      publicRepos: profile.public_repos,
      followers: profile.followers,
      following: profile.following,
    },
    projects: repositories
      .filter((repo) => !repo.fork && !repo.archived && !repo.disabled)
      .map(toProject),
  };
}
