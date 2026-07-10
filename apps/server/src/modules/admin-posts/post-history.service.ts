import { sqlite } from '../../db/client';
import { nowIso, randomId } from '../../lib/format';
import type { PostAutosaveInput } from './admin-posts.schema';

export interface PostVersionSnapshot {
  title: string;
  slug: string;
  summary: string | null;
  contentMd: string;
  coverUrl: string | null;
  status: string;
  visibility: string;
  isFeatured: boolean;
  isPinned: boolean;
  scheduledAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  categoryIds: string[];
  tagIds: string[];
}

export interface PostVersionItem {
  id: string;
  version: number;
  reason: string;
  title: string;
  status: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface PostVersionDetail extends PostVersionItem {
  snapshot: PostVersionSnapshot;
}

export interface PostAutosaveView {
  postId: string;
  payload: PostAutosaveInput;
  updatedAt: string;
}

function buildSnapshot(postId: string): PostVersionSnapshot | null {
  const row = sqlite
    .prepare(
      `SELECT title, slug, summary, content_md AS contentMd, cover_url AS coverUrl,
              status, visibility, is_featured AS isFeatured, is_pinned AS isPinned,
              scheduled_at AS scheduledAt, seo_title AS seoTitle,
              seo_description AS seoDescription, canonical_url AS canonicalUrl
       FROM posts WHERE id = ? LIMIT 1`,
    )
    .get(postId) as Omit<PostVersionSnapshot, 'categoryIds' | 'tagIds'> | undefined;
  if (!row) return null;
  const categoryIds = sqlite
    .prepare('SELECT category_id AS id FROM post_categories WHERE post_id = ? ORDER BY category_id')
    .all(postId) as Array<{ id: string }>;
  const tagIds = sqlite
    .prepare('SELECT tag_id AS id FROM post_tags WHERE post_id = ? ORDER BY tag_id')
    .all(postId) as Array<{ id: string }>;
  return {
    ...row,
    isFeatured: Boolean(row.isFeatured),
    isPinned: Boolean(row.isPinned),
    categoryIds: categoryIds.map((item) => item.id),
    tagIds: tagIds.map((item) => item.id),
  };
}

export function savePostVersion(
  postId: string,
  createdBy: string | null,
  reason: string,
): PostVersionDetail | null {
  const snapshot = buildSnapshot(postId);
  if (!snapshot) return null;
  const current = sqlite
    .prepare('SELECT COALESCE(MAX(version), 0) AS version FROM post_versions WHERE post_id = ?')
    .get(postId) as { version: number };
  const version = Number(current.version) + 1;
  const id = randomId('pvrs_');
  const createdAt = nowIso();
  sqlite
    .prepare(
      `INSERT INTO post_versions
        (id, post_id, version, snapshot_json, reason, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, postId, version, JSON.stringify(snapshot), reason, createdBy, createdAt);
  return {
    id,
    version,
    reason,
    title: snapshot.title,
    status: snapshot.status,
    createdBy,
    createdByName: null,
    createdAt,
    snapshot,
  };
}

export function listPostVersions(postId: string): PostVersionItem[] {
  const rows = sqlite
    .prepare(
      `SELECT pv.id, pv.version, pv.reason, pv.snapshot_json AS snapshotJson,
              pv.created_by AS createdBy, u.username AS createdByName,
              pv.created_at AS createdAt
       FROM post_versions pv
       LEFT JOIN users u ON u.id = pv.created_by
       WHERE pv.post_id = ?
       ORDER BY pv.version DESC
       LIMIT 100`,
    )
    .all(postId) as Array<{
      id: string;
      version: number;
      reason: string;
      snapshotJson: string;
      createdBy: string | null;
      createdByName: string | null;
      createdAt: string;
    }>;
  return rows.map((row) => {
    const snapshot = JSON.parse(row.snapshotJson) as PostVersionSnapshot;
    return {
      id: row.id,
      version: Number(row.version),
      reason: row.reason,
      title: snapshot.title,
      status: snapshot.status,
      createdBy: row.createdBy,
      createdByName: row.createdByName,
      createdAt: row.createdAt,
    };
  });
}

export function getPostVersion(postId: string, versionId: string): PostVersionDetail | null {
  const row = sqlite
    .prepare(
      `SELECT pv.id, pv.version, pv.reason, pv.snapshot_json AS snapshotJson,
              pv.created_by AS createdBy, u.username AS createdByName,
              pv.created_at AS createdAt
       FROM post_versions pv
       LEFT JOIN users u ON u.id = pv.created_by
       WHERE pv.post_id = ? AND pv.id = ? LIMIT 1`,
    )
    .get(postId, versionId) as {
      id: string;
      version: number;
      reason: string;
      snapshotJson: string;
      createdBy: string | null;
      createdByName: string | null;
      createdAt: string;
    } | undefined;
  if (!row) return null;
  const snapshot = JSON.parse(row.snapshotJson) as PostVersionSnapshot;
  return {
    id: row.id,
    version: Number(row.version),
    reason: row.reason,
    title: snapshot.title,
    status: snapshot.status,
    createdBy: row.createdBy,
    createdByName: row.createdByName,
    createdAt: row.createdAt,
    snapshot,
  };
}

export function upsertPostAutosave(
  postId: string,
  userId: string,
  payload: PostAutosaveInput,
): PostAutosaveView {
  const updatedAt = nowIso();
  sqlite
    .prepare(
      `INSERT INTO post_autosaves (post_id, user_id, payload_json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(post_id) DO UPDATE SET
         user_id = excluded.user_id,
         payload_json = excluded.payload_json,
         updated_at = excluded.updated_at`,
    )
    .run(postId, userId, JSON.stringify(payload), updatedAt);
  return { postId, payload, updatedAt };
}

export function getPostAutosave(postId: string, userId: string): PostAutosaveView | null {
  const row = sqlite
    .prepare(
      `SELECT post_id AS postId, payload_json AS payloadJson, updated_at AS updatedAt
       FROM post_autosaves WHERE post_id = ? AND user_id = ? LIMIT 1`,
    )
    .get(postId, userId) as { postId: string; payloadJson: string; updatedAt: string } | undefined;
  if (!row) return null;
  return {
    postId: row.postId,
    payload: JSON.parse(row.payloadJson) as PostAutosaveInput,
    updatedAt: row.updatedAt,
  };
}

export function deletePostAutosave(postId: string, userId?: string): boolean {
  const result = userId
    ? sqlite.prepare('DELETE FROM post_autosaves WHERE post_id = ? AND user_id = ?').run(postId, userId)
    : sqlite.prepare('DELETE FROM post_autosaves WHERE post_id = ?').run(postId);
  return result.changes > 0;
}
