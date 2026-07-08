import type { Category, Tag } from '@blog/shared';
import type { PostRow } from '../../lib/mapping';
import { slugify, estimateReadingTime, randomId, nowIso } from '../../lib/format';
import * as repo from './admin-posts.repository';
import type { PostInput, PostUpdate } from './admin-posts.schema';

export interface AdminPostView {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  contentMd: string;
  coverUrl: string | null;
  status: string;
  isFeatured: boolean;
  isPinned: boolean;
  readingTime: number;
  wordCount: number;
  viewCount: number;
  likeCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: PostRow['author'];
  categoryIds: string[];
  tagIds: string[];
  categories: Category[];
  tags: Tag[];
}

/** 业务冲突（如 slug 已存在），路由层捕获后返回 409。 */
export class ConflictError extends Error {}

/** CJK 字符按字计，西文按词计，得到近似字数。 */
function countWords(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  const cjk = (markdown.match(/[一-鿿]/g) || []).length;
  return words + cjk;
}

/** 基于标题/自定义 slug 生成唯一 slug，冲突时追加序号（仅用于未显式指定 slug 的场景）。 */
async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const root = slugify(base) || 'post';
  if (!(await repo.slugExists(root, exceptId))) return root;
  let i = 2;
  while (await repo.slugExists(`${root}-${i}`, exceptId)) i += 1;
  return `${root}-${i}`;
}

/** 创建时解析 slug：显式提供则校验唯一性，否则由标题自动生成。 */
async function resolveCreateSlug(slugInput: string | undefined, title: string): Promise<string> {
  const provided = slugInput?.trim();
  if (!provided) return uniqueSlug(title);
  const desired = slugify(provided);
  if (!desired) return uniqueSlug(title);
  if (await repo.slugExists(desired)) {
    throw new ConflictError('slug 已存在，请换一个');
  }
  return desired;
}

/** 更新时解析 slug：显式提供则校验唯一性，留空则按标题重新生成，未提供则保留原值。 */
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
  if (await repo.slugExists(desired, id)) {
    throw new ConflictError('slug 已存在，请换一个');
  }
  return desired;
}

function toAdminView(row: PostRow): AdminPostView {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary ?? null,
    contentMd: row.contentMd,
    coverUrl: row.coverUrl ?? null,
    status: row.status,
    isFeatured: row.isFeatured,
    isPinned: row.isPinned,
    readingTime: row.readingTime,
    wordCount: row.wordCount,
    viewCount: row.viewCount,
    likeCount: row.likeCount,
    seoTitle: row.seoTitle ?? null,
    seoDescription: row.seoDescription ?? null,
    canonicalUrl: row.canonicalUrl ?? null,
    publishedAt: row.publishedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: row.author,
    categoryIds: (row.categoryLinks ?? []).map((l) => l.category.id),
    tagIds: (row.tagLinks ?? []).map((l) => l.tag.id),
    categories: (row.categoryLinks ?? []).map((l) => l.category),
    tags: (row.tagLinks ?? []).map((l) => l.tag),
  };
}

export async function listPosts(opts: {
  page: number;
  pageSize: number;
  status?: string;
}) {
  const { rows, total, page, pageSize } = await repo.listAdminPosts(opts);
  return { items: rows.map(toAdminView), total, page, pageSize };
}

export async function getPost(id: string): Promise<AdminPostView | null> {
  const row = await repo.getAdminPostById(id);
  return row ? toAdminView(row) : null;
}

export async function createPost(
  input: PostInput,
  authorId: string,
): Promise<AdminPostView> {
  const slug = await resolveCreateSlug(input.slug, input.title);
  const now = nowIso();
  const publishedAt = input.status === 'published' ? now : null;
  const values: repo.PostInsertValues = {
    id: randomId('p_'),
    title: input.title,
    slug,
    summary: input.summary ?? null,
    contentMd: input.contentMd,
    coverUrl: input.coverUrl ?? null,
    status: input.status,
    isFeatured: input.isFeatured ?? false,
    isPinned: input.isPinned ?? false,
    readingTime: estimateReadingTime(input.contentMd),
    wordCount: countWords(input.contentMd),
    viewCount: 0,
    likeCount: 0,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    canonicalUrl: input.canonicalUrl ?? null,
    publishedAt,
    createdAt: now,
    updatedAt: now,
    authorId,
  };
  const id = await repo.insertPostTx(values, input.categoryIds, input.tagIds);
  return toAdminView((await repo.getAdminPostById(id)) as PostRow);
}

export async function updatePost(
  id: string,
  input: PostUpdate,
): Promise<AdminPostView | null> {
  const existing = await repo.getAdminPostById(id);
  if (!existing) return null;

  const slug = await resolveUpdateSlug(input.slug, existing.slug, input.title ?? existing.title, id);

  const contentMd = input.contentMd ?? existing.contentMd;
  const status = input.status ?? existing.status;
  const now = nowIso();
  const publishedAt =
    status === 'published' && !existing.publishedAt ? now : existing.publishedAt;

  const base: Partial<repo.PostInsertValues> = {
    title: input.title ?? existing.title,
    slug,
    summary: input.summary !== undefined ? input.summary ?? null : existing.summary,
    contentMd,
    coverUrl: input.coverUrl !== undefined ? input.coverUrl ?? null : existing.coverUrl,
    status,
    isFeatured: input.isFeatured ?? existing.isFeatured,
    isPinned: input.isPinned ?? existing.isPinned,
    readingTime: estimateReadingTime(contentMd),
    wordCount: countWords(contentMd),
    seoTitle: input.seoTitle !== undefined ? input.seoTitle ?? null : existing.seoTitle,
    seoDescription:
      input.seoDescription !== undefined ? input.seoDescription ?? null : existing.seoDescription,
    canonicalUrl: input.canonicalUrl !== undefined ? input.canonicalUrl ?? null : existing.canonicalUrl,
    publishedAt,
    updatedAt: now,
  };

  const updated = await repo.updatePostTx(id, base, input.categoryIds, input.tagIds);
  if (!updated) return null;
  return toAdminView((await repo.getAdminPostById(id)) as PostRow);
}

export async function setStatus(id: string, status: string): Promise<AdminPostView | null> {
  const existing = await repo.getAdminPostById(id);
  if (!existing) return null;
  const publishedAt =
    status === 'published' ? existing.publishedAt ?? nowIso() : existing.publishedAt;
  const updated = await repo.setStatusTx(id, status, publishedAt);
  if (!updated) return null;
  return toAdminView((await repo.getAdminPostById(id)) as PostRow);
}

export async function deletePost(id: string): Promise<boolean> {
  const existing = await repo.getAdminPostById(id);
  if (!existing) return false;
  await repo.deletePostTx(id);
  return true;
}
