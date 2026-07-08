import { and, desc, eq, ne, sql, count } from 'drizzle-orm';
import { db } from '../../db/client';
import { posts, postCategories, postTags } from '../../db/schema';
import { nowIso } from '../../lib/format';
import type { PostRow } from '../../lib/mapping';

const ADMIN_RELATIONS = {
  author: true,
  categoryLinks: { with: { category: true } },
  tagLinks: { with: { tag: true } },
} as const;

export interface PostInsertValues {
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
  authorId: string;
}

export async function listAdminPosts(opts: {
  page: number;
  pageSize: number;
  status?: string;
}) {
  const { page, pageSize } = opts;
  const offset = (page - 1) * pageSize;
  const where = opts.status ? eq(posts.status, opts.status) : undefined;

  const rows = await db.query.posts.findMany({
    where,
    orderBy: [desc(posts.updatedAt)],
    with: ADMIN_RELATIONS,
    limit: pageSize,
    offset,
  });

  const [{ total }] = await db
    .select({ total: count() })
    .from(posts)
    .where(where ?? sql`1=1`);

  return { rows: rows as unknown as PostRow[], total, page, pageSize };
}

export async function getAdminPostById(id: string): Promise<PostRow | null> {
  const row = await db.query.posts.findFirst({
    where: eq(posts.id, id),
    with: ADMIN_RELATIONS,
  });
  return (row as unknown as PostRow) ?? null;
}

export async function slugExists(slug: string, exceptId?: string): Promise<boolean> {
  const rows = exceptId
    ? await db
        .select({ slug: posts.slug })
        .from(posts)
        .where(and(eq(posts.slug, slug), ne(posts.id, exceptId)))
    : await db.select({ slug: posts.slug }).from(posts).where(eq(posts.slug, slug));
  return rows.length > 0;
}

export function insertPostTx(
  values: PostInsertValues,
  categoryIds: string[],
  tagIds: string[],
): string {
  return db.transaction((tx) => {
    tx.insert(posts).values(values).run();
    if (categoryIds.length) {
      tx.insert(postCategories)
        .values(categoryIds.map((cid) => ({ postId: values.id, categoryId: cid })))
        .run();
    }
    if (tagIds.length) {
      tx.insert(postTags)
        .values(tagIds.map((tid) => ({ postId: values.id, tagId: tid })))
        .run();
    }
    return values.id;
  });
}

export function updatePostTx(
  id: string,
  base: Partial<PostInsertValues>,
  categoryIds?: string[],
  tagIds?: string[],
): string | null {
  return db.transaction((tx) => {
    const res = tx.update(posts).set(base).where(eq(posts.id, id)).run();
    if (res.changes === 0) return null;
    if (categoryIds !== undefined) {
      tx.delete(postCategories).where(eq(postCategories.postId, id)).run();
      if (categoryIds.length) {
        tx.insert(postCategories)
          .values(categoryIds.map((cid) => ({ postId: id, categoryId: cid })))
          .run();
      }
    }
    if (tagIds !== undefined) {
      tx.delete(postTags).where(eq(postTags.postId, id)).run();
      if (tagIds.length) {
        tx.insert(postTags)
          .values(tagIds.map((tid) => ({ postId: id, tagId: tid })))
          .run();
      }
    }
    return id;
  });
}

export function deletePostTx(id: string) {
  // 外键 onDelete: cascade 会清理 post_categories / post_tags
  db.delete(posts).where(eq(posts.id, id)).run();
}

export async function setStatusTx(id: string, status: string, publishedAt: string | null) {
  const [post] = await db
    .update(posts)
    .set({ status, publishedAt, updatedAt: nowIso() })
    .where(eq(posts.id, id))
    .returning();
  return post ?? null;
}
