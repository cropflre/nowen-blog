import { sqlite } from '../../db/client';
import { nowIso, randomId, slugify } from '../../lib/format';
import type { ProjectCreateInput, ProjectUpdateInput } from './projects.schema';

interface ProjectRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  homepageUrl: string | null;
  language: string | null;
  topicsJson: string;
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
  homepageUrl: string | null;
  language: string | null;
  topics: string[];
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const PROJECT_SELECT = `
  SELECT id,
         name,
         slug,
         description,
         cover_url AS coverUrl,
         homepage_url AS homepageUrl,
         language,
         topics_json AS topicsJson,
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
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    coverUrl: row.coverUrl,
    homepageUrl: row.homepageUrl,
    language: row.language,
    topics: parseTopics(row.topicsJson),
    isFeatured: Boolean(row.isFeatured),
    isPublished: Boolean(row.isPublished),
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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
       ORDER BY is_featured DESC, sort_order ASC, updated_at DESC
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
        id, name, slug, description, cover_url, homepage_url, language,
        topics_json, is_featured, is_published, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.name,
      slug,
      input.description,
      input.coverUrl,
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
        name = ?, slug = ?, description = ?, cover_url = ?, homepage_url = ?,
        language = ?, topics_json = ?, is_featured = ?, is_published = ?,
        sort_order = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      next.name,
      next.slug,
      next.description,
      next.coverUrl,
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
