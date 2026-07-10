import { env } from '../../config/env';
import { sqlite } from '../../db/client';
import { nowIso, randomId, slugify } from '../../lib/format';
import type { ProjectCreateInput, ProjectUpdateInput } from './projects.schema';

interface ProjectRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  repositoryUrl: string | null;
  homepageUrl: string | null;
  language: string | null;
  topicsJson: string;
  stars: number;
  forks: number;
  source: string;
  githubFullName: string | null;
  githubPushedAt: string | null;
  syncedAt: string | null;
  isFeatured: number;
  isPublished: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  repositoryUrl: string | null;
  homepageUrl: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  source: 'manual' | 'github';
  githubFullName: string | null;
  githubPushedAt: string | null;
  syncedAt: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface GitHubRepository {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics?: string[];
  pushed_at: string | null;
  archived: boolean;
  fork: boolean;
}

const PROJECT_SELECT = `
  SELECT id,
         name,
         slug,
         description,
         cover_url AS coverUrl,
         repository_url AS repositoryUrl,
         homepage_url AS homepageUrl,
         language,
         topics_json AS topicsJson,
         stars,
         forks,
         source,
         github_full_name AS githubFullName,
         github_pushed_at AS githubPushedAt,
         synced_at AS syncedAt,
         is_featured AS isFeatured,
         is_published AS isPublished,
         sort_order AS sortOrder,
         created_at AS createdAt,
         updated_at AS updatedAt
  FROM projects
`;

function parseTopics(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function toProject(row: ProjectRow): ProjectView {
  return {
    ...row,
    topics: parseTopics(row.topicsJson),
    source: row.source === 'github' ? 'github' : 'manual',
    isFeatured: Boolean(row.isFeatured),
    isPublished: Boolean(row.isPublished),
  };
}

function normalizeSlug(value: string): string {
  return slugify(value) || `project-${Date.now().toString(36)}`;
}

function uniqueSlug(candidate: string, ignoreId?: string): string {
  const base = normalizeSlug(candidate);
  let value = base;
  let suffix = 2;
  const statement = ignoreId
    ? sqlite.prepare('SELECT 1 FROM projects WHERE slug = ? AND id != ? LIMIT 1')
    : sqlite.prepare('SELECT 1 FROM projects WHERE slug = ? LIMIT 1');
  while (ignoreId ? statement.get(value, ignoreId) : statement.get(value)) {
    value = `${base}-${suffix}`;
    suffix += 1;
  }
  return value;
}

export function listPublicProjects(limit = 24): ProjectView[] {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const rows = sqlite
    .prepare(
      `${PROJECT_SELECT}
       WHERE is_published = 1
       ORDER BY is_featured DESC, sort_order ASC, stars DESC, updated_at DESC
       LIMIT ?`,
    )
    .all(safeLimit) as ProjectRow[];
  return rows.map(toProject);
}

export function listAdminProjects(): ProjectView[] {
  const rows = sqlite
    .prepare(
      `${PROJECT_SELECT}
       ORDER BY is_featured DESC, is_published DESC, sort_order ASC, updated_at DESC`,
    )
    .all() as ProjectRow[];
  return rows.map(toProject);
}

export function getProjectById(id: string): ProjectView | null {
  const row = sqlite.prepare(`${PROJECT_SELECT} WHERE id = ? LIMIT 1`).get(id) as ProjectRow | undefined;
  return row ? toProject(row) : null;
}

export function createProject(input: ProjectCreateInput): ProjectView {
  const id = randomId('prj_');
  const now = nowIso();
  const slug = uniqueSlug(input.slug || input.name);
  sqlite
    .prepare(
      `INSERT INTO projects (
        id, name, slug, description, cover_url, repository_url, homepage_url,
        language, topics_json, stars, forks, source, github_full_name,
        github_pushed_at, synced_at, is_featured, is_published, sort_order,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'manual', NULL, NULL, NULL, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.name,
      slug,
      input.description,
      input.coverUrl,
      input.repositoryUrl,
      input.homepageUrl,
      input.language,
      JSON.stringify(input.topics),
      input.isFeatured ? 1 : 0,
      input.isPublished ? 1 : 0,
      input.sortOrder,
      now,
      now,
    );
  return getProjectById(id)!;
}

export function updateProject(id: string, input: ProjectUpdateInput): ProjectView | null {
  const current = getProjectById(id);
  if (!current) return null;
  const next = {
    name: input.name ?? current.name,
    slug: input.slug === undefined ? current.slug : uniqueSlug(input.slug || input.name || current.name, id),
    description: input.description === undefined ? current.description : input.description,
    coverUrl: input.coverUrl === undefined ? current.coverUrl : input.coverUrl,
    repositoryUrl: input.repositoryUrl === undefined ? current.repositoryUrl : input.repositoryUrl,
    homepageUrl: input.homepageUrl === undefined ? current.homepageUrl : input.homepageUrl,
    language: input.language === undefined ? current.language : input.language,
    topics: input.topics ?? current.topics,
    isFeatured: input.isFeatured ?? current.isFeatured,
    isPublished: input.isPublished ?? current.isPublished,
    sortOrder: input.sortOrder ?? current.sortOrder,
  };
  sqlite
    .prepare(
      `UPDATE projects SET
        name = ?, slug = ?, description = ?, cover_url = ?, repository_url = ?,
        homepage_url = ?, language = ?, topics_json = ?, is_featured = ?,
        is_published = ?, sort_order = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      next.name,
      next.slug,
      next.description,
      next.coverUrl,
      next.repositoryUrl,
      next.homepageUrl,
      next.language,
      JSON.stringify(next.topics),
      next.isFeatured ? 1 : 0,
      next.isPublished ? 1 : 0,
      next.sortOrder,
      nowIso(),
      id,
    );
  return getProjectById(id);
}

export function deleteProject(id: string): boolean {
  return sqlite.prepare('DELETE FROM projects WHERE id = ?').run(id).changes > 0;
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'nowen-blog-project-sync',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (env.githubToken) headers.Authorization = `Bearer ${env.githubToken}`;
  return headers;
}

async function githubRequest<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, { headers: githubHeaders() });
  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { message?: string };
      detail = body.message ? `：${body.message}` : '';
    } catch {
      detail = '';
    }
    if (response.status === 404) throw new Error(`GitHub 仓库或用户不存在${detail}`);
    if (response.status === 403 || response.status === 429) {
      throw new Error(`GitHub API 限额不足，请配置 GITHUB_TOKEN 后重试${detail}`);
    }
    throw new Error(`GitHub 同步失败 (${response.status})${detail}`);
  }
  return (await response.json()) as T;
}

function parseGitHubTarget(input: string): { owner: string; repository?: string } {
  let value = input.trim().replace(/\.git$/i, '');
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
      throw new Error('仅支持 github.com 仓库地址');
    }
    value = url.pathname.replace(/^\/+|\/+$/g, '');
  }
  value = value.replace(/^@/, '').replace(/^\/+|\/+$/g, '');
  const parts = value.split('/').filter(Boolean);
  if (parts.length === 1) return { owner: parts[0] };
  if (parts.length === 2) return { owner: parts[0], repository: parts[1] };
  throw new Error('GitHub 目标格式应为用户名、owner/repo 或完整仓库地址');
}

function upsertGitHubRepository(repo: GitHubRepository): ProjectView {
  const now = nowIso();
  const existing = sqlite
    .prepare(`${PROJECT_SELECT} WHERE github_full_name = ? LIMIT 1`)
    .get(repo.full_name) as ProjectRow | undefined;

  if (existing) {
    sqlite
      .prepare(
        `UPDATE projects SET
          name = ?, description = ?, repository_url = ?, homepage_url = ?,
          language = ?, topics_json = ?, stars = ?, forks = ?, source = 'github',
          github_pushed_at = ?, synced_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        repo.name,
        repo.description,
        repo.html_url,
        repo.homepage || null,
        repo.language,
        JSON.stringify(repo.topics ?? []),
        repo.stargazers_count,
        repo.forks_count,
        repo.pushed_at,
        now,
        now,
        existing.id,
      );
    return getProjectById(existing.id)!;
  }

  const id = randomId('prj_');
  const slug = uniqueSlug(repo.name);
  sqlite
    .prepare(
      `INSERT INTO projects (
        id, name, slug, description, cover_url, repository_url, homepage_url,
        language, topics_json, stars, forks, source, github_full_name,
        github_pushed_at, synced_at, is_featured, is_published, sort_order,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'github', ?, ?, ?, 0, ?, 0, ?, ?)`,
    )
    .run(
      id,
      repo.name,
      slug,
      repo.description,
      repo.html_url,
      repo.homepage || null,
      repo.language,
      JSON.stringify(repo.topics ?? []),
      repo.stargazers_count,
      repo.forks_count,
      repo.full_name,
      repo.pushed_at,
      now,
      repo.archived ? 0 : 1,
      now,
      now,
    );
  return getProjectById(id)!;
}

export async function syncGitHubTarget(target: string, maxRepos = 12): Promise<{
  targetType: 'repository' | 'owner';
  items: ProjectView[];
  synced: number;
}> {
  const parsed = parseGitHubTarget(target);
  if (parsed.repository) {
    const repo = await githubRequest<GitHubRepository>(
      `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repository)}`,
    );
    return { targetType: 'repository', items: [upsertGitHubRepository(repo)], synced: 1 };
  }

  const repos = await githubRequest<GitHubRepository[]>(
    `/users/${encodeURIComponent(parsed.owner)}/repos?sort=updated&direction=desc&per_page=${Math.max(1, Math.min(30, maxRepos))}`,
  );
  const selected = repos.filter((repo) => !repo.fork).slice(0, maxRepos);
  const items = selected.map(upsertGitHubRepository);
  return { targetType: 'owner', items, synced: items.length };
}

export async function syncProject(id: string): Promise<ProjectView | null> {
  const project = getProjectById(id);
  if (!project) return null;
  if (!project.githubFullName) throw new Error('该项目不是 GitHub 同步项目');
  const repo = await githubRequest<GitHubRepository>(`/repos/${project.githubFullName}`);
  return upsertGitHubRepository(repo);
}
