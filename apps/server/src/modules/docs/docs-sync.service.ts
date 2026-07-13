import { env } from '../../config/env';
import { sqlite } from '../../db/client';
import { nowIso, randomId, slugify } from '../../lib/format';

interface SyncSpaceRow {
  id: string;
  repositoryFullName: string | null;
  sourceMode: string;
  docsRoot: string;
}

interface SyncVersionRow {
  id: string;
  spaceId: string;
  sourceRef: string | null;
}

interface GitHubRepository {
  default_branch: string;
}

interface GitTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
}

interface GitTreeResponse {
  tree: GitTreeItem[];
  truncated: boolean;
}

interface GitBlobResponse {
  content: string;
  encoding: string;
  sha: string;
}

interface Frontmatter {
  title?: string;
  description?: string;
  order?: number;
  draft?: boolean;
}

interface SyncItem {
  path: string;
  title: string;
  description: string | null;
  contentMd: string;
  sortOrder: number;
  status: 'draft' | 'published';
  sourceType: 'github' | 'github-section';
  sourcePath: string | null;
  sourceSha: string | null;
  editUrl: string | null;
  depth: number;
  parentPath: string | null;
}

export interface GitHubDocsSyncResult {
  repository: string;
  ref: string;
  scanned: number;
  created: number;
  updated: number;
  unchanged: number;
  archived: number;
  conflicts: number;
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'nowen-blog-docs-sync',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (env.githubToken) headers.Authorization = `Bearer ${env.githubToken}`;
  return headers;
}

async function githubRequest<T>(repository: string, path: string): Promise<T> {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    headers: githubHeaders(),
  });
  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { message?: string };
      detail = body.message ? `：${body.message}` : '';
    } catch {
      detail = '';
    }
    if (response.status === 404) throw new Error(`GitHub 仓库、分支或文档目录不存在${detail}`);
    if (response.status === 403 || response.status === 429) {
      throw new Error(`GitHub API 限额不足，请配置 GITHUB_TOKEN 后重试${detail}`);
    }
    throw new Error(`GitHub 文档同步失败 (${response.status})${detail}`);
  }
  return (await response.json()) as T;
}

function normalizeRepository(value: string): string {
  const normalized = value
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');
  if (!/^[\w.-]+\/[\w.-]+$/.test(normalized)) {
    throw new Error('GitHub 仓库格式必须为 owner/repo 或完整仓库地址');
  }
  return normalized;
}

function normalizeDocsRoot(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '').replace(/\\/g, '/') || 'docs';
}

function parseScalar(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(markdown: string): { attributes: Frontmatter; body: string } {
  const normalized = markdown.replace(/^\uFEFF/, '');
  if (!normalized.startsWith('---\n') && !normalized.startsWith('---\r\n')) {
    return { attributes: {}, body: normalized };
  }
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { attributes: {}, body: normalized };
  const attributes: Frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = parseScalar(line.slice(separator + 1));
    if (key === 'title' && value) attributes.title = value;
    if (key === 'description' && value) attributes.description = value;
    if (key === 'order' || key === 'sortorder') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) attributes.order = Math.max(0, Math.trunc(parsed));
    }
    if (key === 'draft') attributes.draft = /^(true|yes|1)$/i.test(value);
  }
  return { attributes, body: normalized.slice(match[0].length) };
}

function firstHeading(markdown: string): string | null {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.replace(/\s+#+\s*$/, '').trim() || null;
}

function titleFromSegment(segment: string): string {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
}

function slugSegment(value: string): string {
  return slugify(value) || value.toLowerCase().replace(/\s+/g, '-');
}

function documentPath(sourcePath: string, docsRoot: string): string | null {
  const lower = sourcePath.toLowerCase();
  if (lower === 'readme.md') return 'index';
  const prefix = `${docsRoot}/`;
  if (!sourcePath.startsWith(prefix) || !/\.mdx?$/i.test(sourcePath)) return null;
  const relative = sourcePath.slice(prefix.length).replace(/\.mdx?$/i, '');
  const rawSegments = relative.split('/').filter(Boolean);
  if (rawSegments.length === 0) return null;
  const filename = rawSegments.at(-1)!.toLowerCase();
  if (filename === 'readme' || filename === 'index') rawSegments.pop();
  const segments = rawSegments.map(slugSegment).filter(Boolean);
  return segments.join('/') || 'index';
}

function parentPath(path: string): string | null {
  if (path === 'index') return null;
  const segments = path.split('/');
  if (segments.length <= 1) return null;
  segments.pop();
  return segments.join('/');
}

function buildSection(path: string, order: number): SyncItem {
  const title = titleFromSegment(path.split('/').at(-1) ?? '文档');
  return {
    path,
    title,
    description: null,
    contentMd: `# ${title}\n\n本节包含 ${title} 相关文档。`,
    sortOrder: order,
    status: 'published',
    sourceType: 'github-section',
    sourcePath: null,
    sourceSha: null,
    editUrl: null,
    depth: Math.max(0, path.split('/').length - 1),
    parentPath: parentPath(path),
  };
}

function addParentSections(items: Map<string, SyncItem>): void {
  const paths = Array.from(items.keys());
  for (const path of paths) {
    if (path === 'index') continue;
    const segments = path.split('/');
    for (let end = 1; end < segments.length; end += 1) {
      const sectionPath = segments.slice(0, end).join('/');
      if (!items.has(sectionPath)) items.set(sectionPath, buildSection(sectionPath, end * 100));
    }
  }
}

function saveSyncRevision(documentId: string, snapshot: Record<string, unknown>): void {
  const row = sqlite
    .prepare('SELECT COALESCE(MAX(version), 0) + 1 AS nextVersion FROM document_revisions WHERE document_id = ?')
    .get(documentId) as { nextVersion: number };
  sqlite
    .prepare(
      `INSERT INTO document_revisions (id, document_id, version, snapshot_json, reason, created_by, created_at)
       VALUES (?, ?, ?, ?, 'github_sync', NULL, ?)`,
    )
    .run(randomId('drev_'), documentId, row.nextVersion, JSON.stringify(snapshot), nowIso());
}

function decodeBlob(blob: GitBlobResponse): string {
  if (blob.encoding !== 'base64') throw new Error('GitHub 返回了不支持的文档编码');
  return Buffer.from(blob.content.replace(/\s/g, ''), 'base64').toString('utf8');
}

export async function syncGitHubSpaceById(
  spaceId: string,
  options: { versionId?: string; ref?: string; docsRoot?: string } = {},
): Promise<GitHubDocsSyncResult> {
  const space = sqlite
    .prepare(
      `SELECT id, repository_full_name AS repositoryFullName,
              source_mode AS sourceMode, docs_root AS docsRoot
         FROM doc_spaces WHERE id = ? LIMIT 1`,
    )
    .get(spaceId) as SyncSpaceRow | undefined;
  if (!space) throw new Error('文档空间不存在');
  if (space.sourceMode !== 'github') throw new Error('该文档空间不是 GitHub 同步模式');
  if (!space.repositoryFullName) throw new Error('请先配置 GitHub 仓库');

  const version = options.versionId
    ? (sqlite
        .prepare('SELECT id, space_id AS spaceId, source_ref AS sourceRef FROM doc_versions WHERE id = ? AND space_id = ? LIMIT 1')
        .get(options.versionId, space.id) as SyncVersionRow | undefined)
    : (sqlite
        .prepare(
          `SELECT id, space_id AS spaceId, source_ref AS sourceRef
             FROM doc_versions WHERE space_id = ?
             ORDER BY is_default DESC, sort_order ASC, created_at DESC LIMIT 1`,
        )
        .get(space.id) as SyncVersionRow | undefined);
  if (!version) throw new Error('文档版本不存在');

  const repository = normalizeRepository(space.repositoryFullName);
  const repositoryInfo = await githubRequest<GitHubRepository>(repository, '');
  const ref = options.ref?.trim() || version.sourceRef?.trim() || repositoryInfo.default_branch;
  const docsRoot = normalizeDocsRoot(options.docsRoot ?? space.docsRoot);
  const tree = await githubRequest<GitTreeResponse>(
    repository,
    `/git/trees/${encodeURIComponent(ref)}?recursive=1`,
  );
  if (tree.truncated) throw new Error('仓库文件树过大，GitHub 返回了截断结果，请缩小文档目录');

  const markdownBlobs = tree.tree.filter((item) => {
    if (item.type !== 'blob' || !/\.mdx?$/i.test(item.path)) return false;
    const lower = item.path.toLowerCase();
    return lower === 'readme.md' || item.path.startsWith(`${docsRoot}/`);
  });
  if (markdownBlobs.length === 0) throw new Error(`仓库中未找到 README.md 或 ${docsRoot}/ 下的 Markdown 文档`);

  const items = new Map<string, SyncItem>();
  let sequence = 0;
  for (const file of markdownBlobs) {
    const path = documentPath(file.path, docsRoot);
    if (!path) continue;
    const blob = await githubRequest<GitBlobResponse>(repository, `/git/blobs/${file.sha}`);
    const parsed = parseFrontmatter(decodeBlob(blob));
    const fallbackSegment = path === 'index' ? repository.split('/')[1] : path.split('/').at(-1)!;
    const title = parsed.attributes.title || firstHeading(parsed.body) || titleFromSegment(fallbackSegment);
    const depth = path === 'index' ? 0 : Math.max(0, path.split('/').length - 1);
    items.set(path, {
      path,
      title,
      description: parsed.attributes.description ?? null,
      contentMd: parsed.body.trim(),
      sortOrder: parsed.attributes.order ?? sequence * 10,
      status: parsed.attributes.draft ? 'draft' : 'published',
      sourceType: 'github',
      sourcePath: file.path,
      sourceSha: file.sha,
      editUrl: `https://github.com/${repository}/edit/${encodeURIComponent(ref)}/${file.path
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`,
      depth,
      parentPath: parentPath(path),
    });
    sequence += 1;
  }
  addParentSections(items);

  const existing = sqlite
    .prepare(
      `SELECT id, path, title, description, content_md AS contentMd, status, visibility,
              sort_order AS sortOrder, depth, source_type AS sourceType,
              source_path AS sourcePath, source_sha AS sourceSha, edit_url AS editUrl,
              seo_title AS seoTitle, seo_description AS seoDescription,
              parent_id AS parentId, published_at AS publishedAt
         FROM documents WHERE space_id = ? AND version_id = ?`,
    )
    .all(space.id, version.id) as Array<Record<string, unknown>>;
  const existingByPath = new Map(existing.map((row) => [String(row.path), row]));
  const syncedIds = new Map<string, string>();
  const now = nowIso();
  const result: GitHubDocsSyncResult = {
    repository,
    ref,
    scanned: markdownBlobs.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    archived: 0,
    conflicts: 0,
  };

  const transaction = sqlite.transaction(() => {
    const ordered = Array.from(items.values()).sort(
      (a, b) => a.depth - b.depth || a.sortOrder - b.sortOrder || a.path.localeCompare(b.path),
    );
    for (const item of ordered) {
      const current = existingByPath.get(item.path);
      if (current && !['github', 'github-section'].includes(String(current.sourceType))) {
        result.conflicts += 1;
        continue;
      }
      if (current) {
        const id = String(current.id);
        syncedIds.set(item.path, id);
        const unchanged =
          current.sourceSha === item.sourceSha &&
          current.title === item.title &&
          current.description === item.description &&
          current.status === item.status &&
          current.sortOrder === item.sortOrder &&
          current.depth === item.depth;
        if (unchanged) {
          result.unchanged += 1;
          continue;
        }
        saveSyncRevision(id, current);
        sqlite
          .prepare(
            `UPDATE documents SET
              title = ?, slug = ?, description = ?, content_md = ?, status = ?, visibility = 'public',
              sort_order = ?, depth = ?, source_type = ?, source_path = ?, source_sha = ?, edit_url = ?,
              published_at = ?, updated_at = ?
             WHERE id = ?`,
          )
          .run(
            item.title,
            item.path.split('/').at(-1) ?? 'index',
            item.description,
            item.contentMd,
            item.status,
            item.sortOrder,
            item.depth,
            item.sourceType,
            item.sourcePath,
            item.sourceSha,
            item.editUrl,
            item.status === 'published' ? (current.publishedAt ?? now) : null,
            now,
            id,
          );
        result.updated += 1;
      } else {
        const id = randomId('doc_');
        syncedIds.set(item.path, id);
        sqlite
          .prepare(
            `INSERT INTO documents (
              id, space_id, version_id, parent_id, title, slug, path, description,
              content_md, status, visibility, sort_order, depth, source_type,
              source_path, source_sha, edit_url, seo_title, seo_description,
              published_at, created_at, updated_at
            ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'public', ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)`,
          )
          .run(
            id,
            space.id,
            version.id,
            item.title,
            item.path.split('/').at(-1) ?? 'index',
            item.path,
            item.description,
            item.contentMd,
            item.status,
            item.sortOrder,
            item.depth,
            item.sourceType,
            item.sourcePath,
            item.sourceSha,
            item.editUrl,
            item.status === 'published' ? now : null,
            now,
            now,
          );
        result.created += 1;
      }
    }

    for (const item of items.values()) {
      const id = syncedIds.get(item.path);
      if (!id) continue;
      const parentId = item.parentPath ? syncedIds.get(item.parentPath) ?? null : null;
      sqlite.prepare('UPDATE documents SET parent_id = ? WHERE id = ?').run(parentId, id);
    }

    for (const current of existing) {
      const sourceType = String(current.sourceType);
      const path = String(current.path);
      if (!['github', 'github-section'].includes(sourceType) || syncedIds.has(path)) continue;
      sqlite
        .prepare("UPDATE documents SET status = 'archived', published_at = NULL, updated_at = ? WHERE id = ?")
        .run(now, String(current.id));
      result.archived += 1;
    }

    sqlite
      .prepare('UPDATE doc_spaces SET repository_full_name = ?, docs_root = ?, updated_at = ? WHERE id = ?')
      .run(repository, docsRoot, now, space.id);
    sqlite.prepare('UPDATE doc_versions SET source_ref = ?, updated_at = ? WHERE id = ?').run(ref, now, version.id);
  });
  transaction();
  return result;
}
