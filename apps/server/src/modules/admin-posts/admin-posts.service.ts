import type { Category, Tag, PostStatus, PostVisibility } from '@blog/shared';
import type { PostRow } from '../../lib/mapping';
import { slugify, estimateReadingTime, randomId, nowIso } from '../../lib/format';
import { indexPost, removePostFromIndex } from '../search/search.service';
import * as repo from './admin-posts.repository';
import * as history from './post-history.service';
import type { PostAutosaveInput, PostInput, PostUpdate } from './admin-posts.schema';

export interface AdminPostView {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  contentMd: string;
  coverUrl: string | null;
  status: PostStatus;
  visibility: PostVisibility;
  isFeatured: boolean;
  isPinned: boolean;
  readingTime: number;
  wordCount: number;
  viewCount: number;
  likeCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: PostRow['author'];
  categoryIds: string[];
  tagIds: string[];
  categories: Category[];
  tags: Tag[];
}

/** 业务冲突（如 slug 已存在或发布时间无效），路由层捕获后返回 409。 */
export class ConflictError extends Error {}

function countWords(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  const cjk = (markdown.match(/[一-鿿]/g) || []).length;
  return words + cjk;
}

async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const root = slugify(base) || 'post';
  if (!(await repo.slugExists(root, exceptId))) return root;
  let i = 2;
  while (await repo.slugExists(`${root}-${i}`, exceptId)) i += 1;
  return `${root}-${i}`;
}

async function resolveCreateSlug(slugInput: string | undefined, title: string): Promise<string> {
  const provided = slugInput?.trim();
  if (!provided) return uniqueSlug(title);
  const desired = slugify(provided);
  if (!desired) return uniqueSlug(title);
  if (await repo.slugExists(desired)) throw new ConflictError('slug 已存在，请换一个');
  return desired;
}

async function resolveUpdateSlug(
  slugInput: string | undefined,
  existingSlug: string,
  title: string,
  id: string,
): Promise<string> {
  const provided = slugInput?.trim();
  if (provided === undefined) return existingSlug;
  if (provided === '') return uniqueSlug(title, id);
  const desired = slugify(provided);
  if (!desired) return uniqueSlug(title, id);
  if (desired === existingSlug) return existingSlug;
  if (await repo.slugExists(desired, id)) throw new ConflictError('slug 已存在，请换一个');
  return desired;
}

function normalizeScheduledAt(status: string, value: string | null | undefined): string | null {
  if (status !== 'scheduled') return null;
  if (!value) throw new ConflictError('定时发布必须选择发布时间');
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
    throw new ConflictError('定时发布时间必须晚于当前时间');
  }
  return new Date(timestamp).toISOString();
}

type SearchSyncPost = {
  id: string;
  title: string;
  summary: string | null;
  contentMd: string;
  status: string;
  visibility: string;
};

function syncSearchIndex(post: SearchSyncPost): void {
  removePostFromIndex(post.id);
  if (post.status === 'published' && post.visibility === 'public') {
    indexPost({ id: post.id, title: post.title, summary: post.summary, contentMd: post.contentMd });
  }
}

function logAuxiliaryFailure(postId: string, operation: string, error: unknown): void {
  console.error(`[admin-posts] 文章 ${postId} 已保存，但${operation}失败：`, error);
}

/**
 * 搜索索引属于可重建的派生数据。索引维护失败时不能把已经成功的文章写入伪装成 500，
 * 否则客户端会认为创建失败，而刷新后文章实际已经存在。
 */
function syncSearchIndexSafely(post: SearchSyncPost): void {
  try {
    syncSearchIndex(post);
  } catch (error) {
    logAuxiliaryFailure(post.id, '搜索索引同步', error);
  }
}

/** 版本历史是辅助审计能力；主文章已持久化后，版本写入异常应记录日志而不是返回假失败。 */
function savePostVersionSafely(postId: string, userId: string | null, reason: string): void {
  try {
    history.savePostVersion(postId, userId, reason);
  } catch (error) {
    logAuxiliaryFailure(postId, '版本历史写入', error);
  }
}

/** 自动草稿清理失败不应影响正式内容保存。 */
function deletePostAutosaveSafely(postId: string): void {
  try {
    history.deletePostAutosave(postId);
  } catch (error) {
    logAuxiliaryFailure(postId, '自动草稿清理', error);
  }
}

function removePostFromIndexSafely(postId: string): void {
  try {
    removePostFromIndex(postId);
  } catch (error) {
    logAuxiliaryFailure(postId, '搜索索引删除', error);
  }
}

function toAdminView(row: PostRow): AdminPostView {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary ?? null,
    contentMd: row.contentMd,
    coverUrl: row.coverUrl ?? null,
    status: row.status as PostStatus,
    visibility: row.visibility as PostVisibility,
    isFeatured: row.isFeatured,
    isPinned: row.isPinned,
    readingTime: row.readingTime,
    wordCount: row.wordCount,
    viewCount: row.viewCount,
    likeCount: row.likeCount,
    seoTitle: row.seoTitle ?? null,
    seoDescription: row.seoDescription ?? null,
    canonicalUrl: row.canonicalUrl ?? null,
    scheduledAt: row.scheduledAt ?? null,
    publishedAt: row.publishedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: row.author,
    categoryIds: (row.categoryLinks ?? []).map((link) => link.category.id),
    tagIds: (row.tagLinks ?? []).map((link) => link.tag.id),
    categories: (row.categoryLinks ?? []).map((link) => link.category),
    tags: (row.tagLinks ?? []).map((link) => link.tag),
  };
}

export async function listPosts(opts: { page: number; pageSize: number; status?: string }) {
  const { rows, total, page, pageSize } = await repo.listAdminPosts(opts);
  return { items: rows.map(toAdminView), total, page, pageSize };
}

export async function getPost(id: string): Promise<AdminPostView | null> {
  const row = await repo.getAdminPostById(id);
  return row ? toAdminView(row) : null;
}

export async function createPost(input: PostInput, authorId: string): Promise<AdminPostView> {
  const slug = await resolveCreateSlug(input.slug, input.title);
  const now = nowIso();
  const scheduledAt = normalizeScheduledAt(input.status, input.scheduledAt);
  const values: repo.PostInsertValues = {
    id: randomId('p_'),
    title: input.title,
    slug,
    summary: input.summary ?? null,
    contentMd: input.contentMd,
    coverUrl: input.coverUrl ?? null,
    status: input.status,
    visibility: input.visibility,
    isFeatured: input.isFeatured ?? false,
    isPinned: input.isPinned ?? false,
    readingTime: estimateReadingTime(input.contentMd),
    wordCount: countWords(input.contentMd),
    viewCount: 0,
    likeCount: 0,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    canonicalUrl: input.canonicalUrl ?? null,
    scheduledAt,
    publishedAt: input.status === 'published' ? now : null,
    createdAt: now,
    updatedAt: now,
    authorId,
  };
  const id = repo.insertPostTx(values, input.categoryIds, input.tagIds);

  syncSearchIndexSafely(values);
  savePostVersionSafely(id, authorId, input.status === 'scheduled' ? 'schedule' : 'create');

  const created = await repo.getAdminPostById(id);
  if (!created) throw new Error(`文章 ${id} 创建成功后读取失败`);
  return toAdminView(created);
}

export async function updatePost(
  id: string,
  input: PostUpdate,
  userId: string | null = null,
  reason = 'save',
): Promise<AdminPostView | null> {
  const existing = await repo.getAdminPostById(id);
  if (!existing) return null;

  const title = input.title ?? existing.title;
  const slug = await resolveUpdateSlug(input.slug, existing.slug, title, id);
  const contentMd = input.contentMd ?? existing.contentMd;
  const status = input.status ?? existing.status;
  const visibility = input.visibility ?? existing.visibility;
  const scheduleInput = input.scheduledAt !== undefined ? input.scheduledAt : existing.scheduledAt;
  const scheduledAt = normalizeScheduledAt(status, scheduleInput);
  const now = nowIso();
  const publishedAt =
    status === 'published'
      ? existing.publishedAt ?? now
      : status === 'scheduled'
        ? null
        : existing.publishedAt;

  const base: Partial<repo.PostInsertValues> = {
    title,
    slug,
    summary: input.summary !== undefined ? input.summary ?? null : existing.summary,
    contentMd,
    coverUrl: input.coverUrl !== undefined ? input.coverUrl ?? null : existing.coverUrl,
    status,
    visibility,
    isFeatured: input.isFeatured ?? existing.isFeatured,
    isPinned: input.isPinned ?? existing.isPinned,
    readingTime: estimateReadingTime(contentMd),
    wordCount: countWords(contentMd),
    seoTitle: input.seoTitle !== undefined ? input.seoTitle ?? null : existing.seoTitle,
    seoDescription:
      input.seoDescription !== undefined ? input.seoDescription ?? null : existing.seoDescription,
    canonicalUrl: input.canonicalUrl !== undefined ? input.canonicalUrl ?? null : existing.canonicalUrl,
    scheduledAt,
    publishedAt,
    updatedAt: now,
  };

  const updated = repo.updatePostTx(id, base, input.categoryIds, input.tagIds);
  if (!updated) return null;
  const saved = await repo.getAdminPostById(id);
  if (!saved) throw new Error(`文章 ${id} 更新成功后读取失败`);

  syncSearchIndexSafely(saved);
  deletePostAutosaveSafely(id);
  const versionReason = reason === 'restore' ? 'restore' : status === 'scheduled' ? 'schedule' : reason;
  savePostVersionSafely(id, userId, versionReason);
  return toAdminView(saved);
}

export async function setStatus(
  id: string,
  status: 'draft' | 'published' | 'archived',
  userId: string | null = null,
): Promise<AdminPostView | null> {
  const existing = await repo.getAdminPostById(id);
  if (!existing) return null;
  const publishedAt = status === 'published' ? existing.publishedAt ?? nowIso() : existing.publishedAt;
  const updated = await repo.setStatusTx(id, status, publishedAt, null);
  if (!updated) return null;
  const saved = await repo.getAdminPostById(id);
  if (!saved) throw new Error(`文章 ${id} 状态更新成功后读取失败`);

  syncSearchIndexSafely(saved);
  deletePostAutosaveSafely(id);
  const versionReason =
    status === 'published' ? 'publish' : status === 'archived' ? 'archive' : 'unpublish';
  savePostVersionSafely(id, userId, versionReason);
  return toAdminView(saved);
}

export function listVersions(postId: string) {
  return history.listPostVersions(postId);
}

export function getVersion(postId: string, versionId: string) {
  return history.getPostVersion(postId, versionId);
}

export async function restoreVersion(
  postId: string,
  versionId: string,
  userId: string,
): Promise<AdminPostView | null> {
  const version = history.getPostVersion(postId, versionId);
  if (!version) return null;
  const snapshot = { ...version.snapshot };
  if (
    snapshot.status === 'scheduled' &&
    (!snapshot.scheduledAt || new Date(snapshot.scheduledAt).getTime() <= Date.now())
  ) {
    snapshot.status = 'draft';
    snapshot.scheduledAt = null;
  }
  return updatePost(postId, snapshot as PostUpdate, userId, 'restore');
}

export async function saveAutosave(postId: string, userId: string, payload: PostAutosaveInput) {
  const existing = await repo.getAdminPostById(postId);
  if (!existing) return null;
  return history.upsertPostAutosave(postId, userId, payload);
}

export async function getAutosave(postId: string, userId: string) {
  const existing = await repo.getAdminPostById(postId);
  if (!existing) return null;
  return history.getPostAutosave(postId, userId);
}

export function deleteAutosave(postId: string, userId: string): boolean {
  return history.deletePostAutosave(postId, userId);
}

export async function deletePost(id: string): Promise<boolean> {
  const existing = await repo.getAdminPostById(id);
  if (!existing) return false;
  repo.deletePostTx(id);
  removePostFromIndexSafely(id);
  return true;
}
