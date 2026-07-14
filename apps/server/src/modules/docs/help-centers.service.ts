import { sqlite } from '../../db/client';
import type { DocSpaceRow, DocVersionRow, DocumentRow } from './docs.types';
import {
  getDocumentById,
  getPublicPage,
  getSpaceById,
  getSpaceBySlug,
  listDocuments,
  normalizeSlug,
  orderDocumentsDepthFirst,
  resolveVersion,
  SPACE_SELECT,
  toSpace,
  toVersion,
  uniqueDocumentPath,
} from './docs.service';

export const MAX_HELP_CENTER_DEPTH = 1;

export function getHelpCenterVersion(spaceId: string, publicOnly = false): DocVersionRow | null {
  return resolveVersion(spaceId, 'latest', publicOnly);
}

export function listHelpCenters(publicOnly = false) {
  const where = publicOnly ? 'WHERE s.is_published = 1' : '';
  const rows = sqlite
    .prepare(`${SPACE_SELECT} ${where} ORDER BY s.sort_order ASC, s.updated_at DESC`)
    .all() as DocSpaceRow[];
  return rows.map((row) => {
    const version = getHelpCenterVersion(row.id, publicOnly);
    return {
      ...toSpace(row),
      helpCenterVersionId: version?.id ?? null,
      sourceRef: version?.sourceRef ?? null,
      defaultVersion: version ? toVersion(version) : null,
    };
  });
}

export function getHelpCenterById(id: string) {
  const space = getSpaceById(id);
  if (!space) return null;
  const version = getHelpCenterVersion(space.id, false);
  return {
    ...toSpace(space),
    helpCenterVersionId: version?.id ?? null,
    sourceRef: version?.sourceRef ?? null,
    defaultVersion: version ? toVersion(version) : null,
  };
}

export function getPublicHelpCenter(slug: string) {
  const space = getSpaceBySlug(slug, true);
  if (!space) return null;
  const version = getHelpCenterVersion(space.id, true);
  if (!version) return null;
  return { space, version };
}

function rootAncestor(item: DocumentRow, byId: Map<string, DocumentRow>): DocumentRow | null {
  let current = item;
  const visited = new Set<string>();
  while (current.parentId) {
    if (visited.has(current.id)) return null;
    visited.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) return null;
    current = parent;
  }
  return current.id === item.id ? null : current;
}

/**
 * 旧数据和 GitHub 深层目录在读取时统一压平为“栏目 + 文章”两级。
 * 数据源路径仍保留，避免破坏已有链接和同步 SHA。
 */
export function flattenHelpCenterDocuments(items: DocumentRow[]): DocumentRow[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return items.map((item) => {
    if (!item.parentId || item.depth <= MAX_HELP_CENTER_DEPTH) return { ...item, depth: Math.min(item.depth, 1) };
    const root = rootAncestor(item, byId);
    return {
      ...item,
      parentId: root?.id ?? null,
      depth: root ? 1 : 0,
    };
  });
}

export function listHelpCenterDocuments(spaceId: string, versionId: string, publicOnly = false): DocumentRow[] {
  return flattenHelpCenterDocuments(listDocuments(spaceId, versionId, publicOnly));
}

export function orderedHelpCenterDocuments(spaceId: string, versionId: string, publicOnly = false): DocumentRow[] {
  return orderDocumentsDepthFirst(listHelpCenterDocuments(spaceId, versionId, publicOnly));
}

export function getPublicHelpCenterPage(spaceId: string, versionId: string, path: string): DocumentRow | null {
  return getPublicPage(spaceId, versionId, path.replace(/^latest\/?/, ''));
}

export function validateHelpCenterParent(
  versionId: string,
  parentId: string | null,
  currentId?: string,
): { parent: DocumentRow | null; error: string | null } {
  if (!parentId) return { parent: null, error: null };
  const parent = getDocumentById(parentId);
  if (!parent || parent.versionId !== versionId) {
    return { parent: null, error: '所选一级栏目不存在' };
  }
  if (parent.id === currentId) return { parent: null, error: '不能把页面放到自己下面' };
  if (parent.parentId || parent.depth > 0) {
    return { parent: null, error: '帮助中心最多二级，子页面不能继续创建下级' };
  }
  return { parent, error: null };
}

export function documentHasChildren(documentId: string): boolean {
  const row = sqlite.prepare('SELECT 1 FROM documents WHERE parent_id = ? LIMIT 1').get(documentId);
  return Boolean(row);
}

export function nextHelpCenterSortOrder(versionId: string, parentId: string | null): number {
  const row = sqlite
    .prepare(
      `SELECT COALESCE(MAX(sort_order), -10) + 10 AS nextSort
       FROM documents
       WHERE version_id = ? AND parent_id IS ?`,
    )
    .get(versionId, parentId) as { nextSort: number };
  return Number(row.nextSort ?? 0);
}

export function buildHelpCenterDocumentPath(
  versionId: string,
  title: string,
  parent: DocumentRow | null,
  currentId?: string,
): { slug: string; path: string } {
  const slug = normalizeSlug(title, title);
  const candidate = parent ? `${parent.path}/${slug}` : slug;
  return {
    slug,
    path: uniqueDocumentPath(versionId, candidate, currentId),
  };
}
