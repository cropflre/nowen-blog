import { and, desc, eq, inArray, sql, count } from 'drizzle-orm';
import { db } from '../../db/client';
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

  const conditions = [eq(posts.status, 'published')];
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
    where: and(eq(posts.slug, slug), eq(posts.status, 'published')),
    with: POST_RELATIONS,
  });
  return (row as unknown as PostRow) ?? null;
}

export async function incrementView(id: string) {
  await db.update(posts).set({ viewCount: sql`${posts.viewCount} + 1` }).where(eq(posts.id, id));
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
    .select({
      slug: posts.slug,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .where(and(eq(posts.status, 'published'), eq(posts.visibility, 'public')))
    .orderBy(desc(posts.publishedAt));
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
