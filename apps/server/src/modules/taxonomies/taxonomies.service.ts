import { and, asc, eq, desc, count } from 'drizzle-orm';
import type { PostSummary } from '@blog/shared';
import { db } from '../../db/client';
import { posts, categories, tags, postCategories, postTags } from '../../db/schema';
import { toSummary, type PostRow } from '../../lib/mapping';

export interface CategoryView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  postCount: number;
}

export interface TagView {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  postCount: number;
}

export async function listCategories(): Promise<CategoryView[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      color: categories.color,
      sortOrder: categories.sortOrder,
      postCount: count(postCategories.postId),
    })
    .from(categories)
    .leftJoin(postCategories, eq(categories.id, postCategories.categoryId))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder));
  return rows;
}

export async function listTags(): Promise<TagView[]> {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      color: tags.color,
      postCount: count(postTags.postId),
    })
    .from(tags)
    .leftJoin(postTags, eq(tags.id, postTags.tagId))
    .groupBy(tags.id)
    .orderBy(desc(count(postTags.postId)));
  return rows;
}

export interface ArchiveMonth {
  month: number;
  total: number;
  posts: PostSummary[];
}

export interface ArchiveYear {
  year: number;
  total: number;
  months: ArchiveMonth[];
}

export async function getArchive(): Promise<ArchiveYear[]> {
  const rows = await db.query.posts.findMany({
    where: and(eq(posts.status, 'published'), eq(posts.visibility, 'public')),
    orderBy: [desc(posts.publishedAt)],
    with: {
      author: true,
      categoryLinks: { with: { category: true } },
      tagLinks: { with: { tag: true } },
    },
  });
  const summaries = (rows as unknown as PostRow[]).map(toSummary);

  const byYear = new Map<number, { year: number; total: number; months: Map<number, ArchiveMonth> }>();
  for (const p of summaries) {
    const d = new Date(p.publishedAt ?? p.updatedAt);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    if (!byYear.has(year)) {
      byYear.set(year, { year, total: 0, months: new Map() });
    }
    const yearGroup = byYear.get(year)!;
    yearGroup.total += 1;
    if (!yearGroup.months.has(month)) {
      yearGroup.months.set(month, { month, total: 0, posts: [] });
    }
    const monthGroup = yearGroup.months.get(month)!;
    monthGroup.total += 1;
    monthGroup.posts.push(p);
  }

  return Array.from(byYear.values())
    .sort((a, b) => b.year - a.year)
    .map((g) => ({
      year: g.year,
      total: g.total,
      months: Array.from(g.months.values())
        .sort((a, b) => b.month - a.month)
        .map((m) => ({ month: m.month, total: m.total, posts: m.posts })),
    }));
}
