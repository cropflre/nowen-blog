import { and, desc, eq, inArray, count } from 'drizzle-orm';
import { db, sqlite } from '../../db/client';
import { posts, categories, tags, postCategories, postTags } from '../../db/schema';
import type { PostRow } from '../../lib/mapping';

export interface ListPostsOptions {
  page?: number;
  pageSize?: number;
  categorySlug?: string;
  tagSlug?: string;
  featured?: boolean;
}

const POST_RELATIONS = {
  author: true,
  categoryLinks: { with: { category: true } },
  tagLinks: { with: { tag: true } },
} as const;

export async function listPosts(opts: ListPostsOptions = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 10));
  const offset = (page - 1) * pageSize;

  const conditions = [eq(posts.status, 'published'), eq(posts.visibility, 'public')];
  if (opts.featured) conditions.push(eq(posts.isFeatured, true));

  let idFilter: string[] | null = null;
  if (opts.categorySlug) idFilter = await postIdsByCategory(opts.categorySlug);
  else if (opts.tagSlug) idFilter = await postIdsByTag(opts.tagSlug);

  const where = idFilter
    ? and(...conditions, inArray(posts.id, idFilter))
    : and(...conditions);

  const rows = await db.query.posts.findMany({
    where,
    orderBy: [desc(posts.isPinned), desc(posts.publishedAt)],
    with: POST_RELATIONS,
    limit: pageSize,
    offset,
  });

  const [{ total }] = await db.select({ total: count() }).from(posts).where(where);
  return { rows: rows as unknown as PostRow[], total, page, pageSize };
}

export async function getPostBySlug(slug: string): Promise<PostRow | null> {
  const row = await db.query.posts.findFirst({
    where: and(eq(posts.slug, slug), eq(posts.status, 'published'), eq(posts.visibility, 'public')),
    with: POST_RELATIONS,
  });
  return (row as unknown as PostRow) ?? null;
}

async function hydrateOrdered(ids: string[]): Promise<PostRow[]> {
  if (ids.length === 0) return [];
  const rows = await db.query.posts.findMany({ where: inArray(posts.id, ids), with: POST_RELATIONS });
  const byId = new Map((rows as unknown as PostRow[]).map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is PostRow => Boolean(row));
}

/** previous 为更早发布的文章，next 为更新发布的文章。 */
export async function getAdjacentPosts(postId: string, publishedAt: string | null) {
  const anchor = publishedAt ?? '';
  const previous = sqlite
    .prepare(
      `SELECT id FROM posts
       WHERE status = 'published' AND visibility = 'public' AND id <> ?
         AND (COALESCE(published_at, '') < ? OR (COALESCE(published_at, '') = ? AND id < ?))
       ORDER BY COALESCE(published_at, '') DESC, id DESC LIMIT 1`,
    )
    .get(postId, anchor, anchor, postId) as { id: string } | undefined;
  const next = sqlite
    .prepare(
      `SELECT id FROM posts
       WHERE status = 'published' AND visibility = 'public' AND id <> ?
         AND (COALESCE(published_at, '') > ? OR (COALESCE(published_at, '') = ? AND id > ?))
       ORDER BY COALESCE(published_at, '') ASC, id ASC LIMIT 1`,
    )
    .get(postId, anchor, anchor, postId) as { id: string } | undefined;
  const hydrated = await hydrateOrdered([previous?.id, next?.id].filter((id): id is string => Boolean(id)));
  const byId = new Map(hydrated.map((row) => [row.id, row]));
  return {
    previous: previous ? byId.get(previous.id) ?? null : null,
    next: next ? byId.get(next.id) ?? null : null,
  };
}

/** 按共同分类、共同标签、精选状态和发布时间计算相关文章。 */
export async function getRelatedPosts(postId: string, limit = 4): Promise<PostRow[]> {
  const rows = sqlite
    .prepare(
      `SELECT p.id,
         ((SELECT COUNT(*) FROM post_categories mine
            JOIN post_categories other ON other.category_id = mine.category_id
           WHERE mine.post_id = ? AND other.post_id = p.id) * 3
          + (SELECT COUNT(*) FROM post_tags mine
            JOIN post_tags other ON other.tag_id = mine.tag_id
           WHERE mine.post_id = ? AND other.post_id = p.id) * 2
          + CASE WHEN p.is_featured = 1 THEN 1 ELSE 0 END) AS score
       FROM posts p
       WHERE p.id <> ? AND p.status = 'published' AND p.visibility = 'public'
       ORDER BY score DESC, COALESCE(p.published_at, '') DESC
       LIMIT ?`,
    )
    .all(postId, postId, postId, Math.max(1, Math.min(12, limit))) as Array<{ id: string; score: number }>;
  return hydrateOrdered(rows.map((row) => row.id));
}

/** 供 RSS 使用：已发布且公开的全体文章，按发布时间倒序。 */
export async function listPublishedForFeed(limit = 50): Promise<PostRow[]> {
  const rows = await db.query.posts.findMany({
    where: and(eq(posts.status, 'published'), eq(posts.visibility, 'public')),
    orderBy: [desc(posts.publishedAt)],
    with: POST_RELATIONS,
    limit,
  });
  return rows as unknown as PostRow[];
}

/** 供 Sitemap 使用：已发布且公开文章的 slug 与时间，仅取必要字段。 */
export async function listPublishedForSitemap(): Promise<
  { slug: string; publishedAt: string | null; updatedAt: string }[]
> {
  return db
    .select({ slug: posts.slug, publishedAt: posts.publishedAt, updatedAt: posts.updatedAt })
    .from(posts)
    .where(and(eq(posts.status, 'published'), eq(posts.visibility, 'public')))
    .orderBy(desc(posts.publishedAt));
}

/** 供预渲染使用：全部已发布且公开文章。 */
export async function listPublishedForPrerender(): Promise<PostRow[]> {
  return (await db.query.posts.findMany({
    where: and(eq(posts.status, 'published'), eq(posts.visibility, 'public')),
    orderBy: [desc(posts.isPinned), desc(posts.publishedAt)],
    with: POST_RELATIONS,
  })) as unknown as PostRow[];
}

async function postIdsByCategory(slug: string): Promise<string[]> {
  const rows = await db
    .select({ postId: postCategories.postId })
    .from(postCategories)
    .innerJoin(categories, eq(postCategories.categoryId, categories.id))
    .where(eq(categories.slug, slug));
  return rows.map((r) => r.postId);
}

async function postIdsByTag(slug: string): Promise<string[]> {
  const rows = await db
    .select({ postId: postTags.postId })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(tags.slug, slug));
  return rows.map((r) => r.postId);
}
