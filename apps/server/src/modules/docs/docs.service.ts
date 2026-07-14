import { sqlite } from '../../db/client';
import { nowIso, randomId, slugify } from '../../lib/format';
import type { DocSpaceRow, DocVersionRow, DocumentRow } from './docs.types';

export const SPACE_SELECT = `
  SELECT s.id,
         s.project_id AS projectId,
         s.name,
         s.slug,
         s.description,
         s.icon_url AS iconUrl,
         s.default_version_id AS defaultVersionId,
         s.is_published AS isPublished,
         s.sort_order AS sortOrder,
         s.created_at AS createdAt,
         s.updated_at AS updatedAt,
         (SELECT COUNT(*) FROM documents d WHERE d.space_id = s.id AND d.status = 'published') AS documentCount
    FROM doc_spaces s
`;

export const VERSION_SELECT = `
  SELECT id,
         space_id AS spaceId,
         version,
         label,
         source_ref AS sourceRef,
         status,
         is_default AS isDefault,
         is_deprecated AS isDeprecated,
         sort_order AS sortOrder,
         created_at AS createdAt,
         updated_at AS updatedAt
    FROM doc_versions
`;

export const DOCUMENT_SELECT = `
  SELECT id,
         space_id AS spaceId,
         version_id AS versionId,
         parent_id AS parentId,
         title,
         slug,
         path,
         description,
         content_md AS contentMd,
         status,
         visibility,
         sort_order AS sortOrder,
         depth,
         source_type AS sourceType,
         source_path AS sourcePath,
         source_sha AS sourceSha,
         edit_url AS editUrl,
         seo_title AS seoTitle,
         seo_description AS seoDescription,
         published_at AS publishedAt,
         created_at AS createdAt,
         updated_at AS updatedAt
    FROM documents
`;

export function toSpace(row: DocSpaceRow) {
  return {
    ...row,
    isPublished: Boolean(row.isPublished),
    documentCount: Number(row.documentCount ?? 0),
  };
}

export function toVersion(row: DocVersionRow) {
  return {
    ...row,
    isDefault: Boolean(row.isDefault),
    isDeprecated: Boolean(row.isDeprecated),
  };
}

export function normalizeSlug(value: string, fallback: string): string {
  return slugify(value) || slugify(fallback) || `item-${Date.now().toString(36)}`;
}

export function normalizePath(value: string): string {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => slugify(segment) || segment)
    .join('/');
}

export function uniqueSpaceSlug(candidate: string, ignoreId?: string): string {
  const base = normalizeSlug(candidate, 'docs');
  let value = base;
  let suffix = 2;
  const statement = ignoreId
    ? sqlite.prepare('SELECT 1 FROM doc_spaces WHERE slug = ? AND id != ? LIMIT 1')
    : sqlite.prepare('SELECT 1 FROM doc_spaces WHERE slug = ? LIMIT 1');
  while (ignoreId ? statement.get(value, ignoreId) : statement.get(value)) {
    value = `${base}-${suffix}`;
    suffix += 1;
  }
  return value;
}

export function uniqueDocumentPath(versionId: string, candidate: string, ignoreId?: string): string {
  const normalized = normalizePath(candidate) || 'index';
  let value = normalized;
  let suffix = 2;
  const statement = ignoreId
    ? sqlite.prepare('SELECT 1 FROM documents WHERE version_id = ? AND path = ? AND id != ? LIMIT 1')
    : sqlite.prepare('SELECT 1 FROM documents WHERE version_id = ? AND path = ? LIMIT 1');
  while (ignoreId ? statement.get(versionId, value, ignoreId) : statement.get(versionId, value)) {
    value = `${normalized}-${suffix}`;
    suffix += 1;
  }
  return value;
}

export function getSpaceById(id: string): DocSpaceRow | null {
  return (sqlite.prepare(`${SPACE_SELECT} WHERE s.id = ? LIMIT 1`).get(id) as DocSpaceRow | undefined) ?? null;
}

export function getSpaceBySlug(slug: string, publicOnly = false): DocSpaceRow | null {
  const suffix = publicOnly ? ' AND s.is_published = 1' : '';
  return (
    (sqlite.prepare(`${SPACE_SELECT} WHERE s.slug = ?${suffix} LIMIT 1`).get(slug) as DocSpaceRow | undefined) ??
    null
  );
}

export function getVersionById(id: string): DocVersionRow | null {
  return (sqlite.prepare(`${VERSION_SELECT} WHERE id = ? LIMIT 1`).get(id) as DocVersionRow | undefined) ?? null;
}

export function listVersions(spaceId: string, publicOnly = false): DocVersionRow[] {
  const where = publicOnly ? "WHERE space_id = ? AND status = 'published'" : 'WHERE space_id = ?';
  return sqlite
    .prepare(`${VERSION_SELECT} ${where} ORDER BY is_default DESC, sort_order ASC, created_at DESC`)
    .all(spaceId) as DocVersionRow[];
}

export function resolveVersion(spaceId: string, requested?: string, publicOnly = true): DocVersionRow | null {
  const publicFilter = publicOnly ? " AND status = 'published'" : '';
  if (requested && requested !== 'latest') {
    const exact = sqlite
      .prepare(`${VERSION_SELECT} WHERE space_id = ? AND version = ?${publicFilter} LIMIT 1`)
      .get(spaceId, requested) as DocVersionRow | undefined;
    if (exact) return exact;
  }
  return (
    (sqlite
      .prepare(
        `${VERSION_SELECT} WHERE space_id = ?${publicFilter}
         ORDER BY is_default DESC, sort_order ASC, created_at DESC LIMIT 1`,
      )
      .get(spaceId) as DocVersionRow | undefined) ?? null
  );
}

export function getDocumentById(id: string): DocumentRow | null {
  return (sqlite.prepare(`${DOCUMENT_SELECT} WHERE id = ? LIMIT 1`).get(id) as DocumentRow | undefined) ?? null;
}

export function wouldCreateDocumentCycle(documentId: string, parentId: string | null): boolean {
  let currentId = parentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === documentId || visited.has(currentId)) return true;
    visited.add(currentId);
    currentId = getDocumentById(currentId)?.parentId ?? null;
  }
  return false;
}

export function listDocuments(spaceId: string, versionId: string, publicOnly = false): DocumentRow[] {
  const publicFilter = publicOnly ? " AND status = 'published' AND visibility = 'public'" : '';
  return sqlite
    .prepare(
      `${DOCUMENT_SELECT}
       WHERE space_id = ? AND version_id = ?${publicFilter}
       ORDER BY depth ASC, sort_order ASC, title COLLATE NOCASE ASC`,
    )
    .all(spaceId, versionId) as DocumentRow[];
}

export function orderDocumentsDepthFirst(items: DocumentRow[]): DocumentRow[] {
  const children = new Map<string | null, DocumentRow[]>();
  for (const item of items) {
    const group = children.get(item.parentId) ?? [];
    group.push(item);
    children.set(item.parentId, group);
  }
  for (const group of children.values()) {
    group.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  }
  const ordered: DocumentRow[] = [];
  const visited = new Set<string>();
  const visit = (parentId: string | null) => {
    for (const item of children.get(parentId) ?? []) {
      if (visited.has(item.id)) continue;
      visited.add(item.id);
      ordered.push(item);
      visit(item.id);
    }
  };
  visit(null);
  for (const item of items) if (!visited.has(item.id)) ordered.push(item);
  return ordered;
}

export function getPublicPage(spaceId: string, versionId: string, path: string): DocumentRow | null {
  const normalized = normalizePath(path);
  if (normalized) {
    const exact = sqlite
      .prepare(
        `${DOCUMENT_SELECT}
         WHERE space_id = ? AND version_id = ? AND path = ?
           AND status = 'published' AND visibility = 'public'
         LIMIT 1`,
      )
      .get(spaceId, versionId, normalized) as DocumentRow | undefined;
    if (exact) return exact;
    const redirect = sqlite
      .prepare(
        `SELECT to_path AS toPath FROM document_redirects
         WHERE space_id = ? AND (version_id = ? OR version_id IS NULL) AND from_path = ?
         ORDER BY version_id IS NULL ASC LIMIT 1`,
      )
      .get(spaceId, versionId, normalized) as { toPath: string } | undefined;
    if (!redirect) return null;
    return (
      (sqlite
        .prepare(
          `${DOCUMENT_SELECT}
           WHERE space_id = ? AND version_id = ? AND path = ?
             AND status = 'published' AND visibility = 'public'
           LIMIT 1`,
        )
        .get(spaceId, versionId, redirect.toPath) as DocumentRow | undefined) ?? null
    );
  }
  return (
    (sqlite
      .prepare(
        `${DOCUMENT_SELECT}
         WHERE space_id = ? AND version_id = ?
           AND status = 'published' AND visibility = 'public'
         ORDER BY depth ASC, sort_order ASC, created_at ASC LIMIT 1`,
      )
      .get(spaceId, versionId) as DocumentRow | undefined) ?? null
  );
}

function revisionSnapshot(document: DocumentRow): string {
  return JSON.stringify({
    title: document.title,
    slug: document.slug,
    path: document.path,
    parentId: document.parentId,
    description: document.description,
    contentMd: document.contentMd,
    status: document.status,
    visibility: document.visibility,
    sortOrder: document.sortOrder,
    depth: document.depth,
    seoTitle: document.seoTitle,
    seoDescription: document.seoDescription,
  });
}

export function saveRevision(document: DocumentRow, userId: string, reason = 'save'): void {
  const row = sqlite
    .prepare('SELECT COALESCE(MAX(version), 0) + 1 AS nextVersion FROM document_revisions WHERE document_id = ?')
    .get(document.id) as { nextVersion: number };
  sqlite
    .prepare(
      `INSERT INTO document_revisions (id, document_id, version, snapshot_json, reason, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(randomId('drev_'), document.id, row.nextVersion, revisionSnapshot(document), reason, userId, nowIso());
}

export function createRedirect(document: DocumentRow, nextPath: string): void {
  sqlite
    .prepare(
      `INSERT INTO document_redirects (
        id, space_id, version_id, from_path, to_path, status_code, created_at
      ) VALUES (?, ?, ?, ?, ?, 301, ?)
      ON CONFLICT(space_id, version_id, from_path)
      DO UPDATE SET to_path = excluded.to_path, status_code = 301`,
    )
    .run(randomId('dred_'), document.spaceId, document.versionId, document.path, nextPath, nowIso());
  sqlite
    .prepare('UPDATE document_redirects SET to_path = ? WHERE space_id = ? AND version_id = ? AND to_path = ?')
    .run(nextPath, document.spaceId, document.versionId, document.path);
}

export function moveDescendants(document: DocumentRow, nextPath: string, nextDepth: number): void {
  const descendants = sqlite
    .prepare(`${DOCUMENT_SELECT} WHERE version_id = ? AND path LIKE ? ORDER BY depth ASC`)
    .all(document.versionId, `${document.path}/%`) as DocumentRow[];
  const depthDelta = nextDepth - document.depth;
  const update = sqlite.prepare('UPDATE documents SET path = ?, depth = ?, updated_at = ? WHERE id = ?');
  for (const descendant of descendants) {
    const suffix = descendant.path.slice(document.path.length);
    const descendantPath = `${nextPath}${suffix}`;
    if (descendantPath !== descendant.path) createRedirect(descendant, descendantPath);
    update.run(descendantPath, descendant.depth + depthDelta, nowIso(), descendant.id);
  }
}
