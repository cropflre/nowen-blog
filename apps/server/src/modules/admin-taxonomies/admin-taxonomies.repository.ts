import { and, asc, count, desc, eq, ne } from 'drizzle-orm';
import { db } from '../../db/client';
import { categories, tags, postCategories, postTags } from '../../db/schema';

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  postCount: number;
  createdAt: string;
}

export interface TagRow {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  postCount: number;
  createdAt: string;
}

export interface CategoryInsertValues {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface TagInsertValues {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  createdAt: string;
}

const categoryColumns = {
  id: categories.id,
  name: categories.name,
  slug: categories.slug,
  description: categories.description,
  color: categories.color,
  sortOrder: categories.sortOrder,
  postCount: count(postCategories.postId),
  createdAt: categories.createdAt,
};

export async function listCategories(): Promise<CategoryRow[]> {
  return db
    .select(categoryColumns)
    .from(categories)
    .leftJoin(postCategories, eq(categories.id, postCategories.categoryId))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder));
}

export async function getCategoryById(id: string): Promise<CategoryRow | null> {
  const rows = await db
    .select(categoryColumns)
    .from(categories)
    .leftJoin(postCategories, eq(categories.id, postCategories.categoryId))
    .where(eq(categories.id, id))
    .groupBy(categories.id);
  return rows[0] ?? null;
}

const tagColumns = {
  id: tags.id,
  name: tags.name,
  slug: tags.slug,
  color: tags.color,
  postCount: count(postTags.postId),
  createdAt: tags.createdAt,
};

export async function listTags(): Promise<TagRow[]> {
  return db
    .select(tagColumns)
    .from(tags)
    .leftJoin(postTags, eq(tags.id, postTags.tagId))
    .groupBy(tags.id)
    .orderBy(desc(count(postTags.postId)));
}

export async function getTagById(id: string): Promise<TagRow | null> {
  const rows = await db
    .select(tagColumns)
    .from(tags)
    .leftJoin(postTags, eq(tags.id, postTags.tagId))
    .where(eq(tags.id, id))
    .groupBy(tags.id);
  return rows[0] ?? null;
}

export async function categorySlugExists(slug: string, exceptId?: string): Promise<boolean> {
  const rows = exceptId
    ? await db
        .select({ slug: categories.slug })
        .from(categories)
        .where(and(eq(categories.slug, slug), ne(categories.id, exceptId)))
    : await db.select({ slug: categories.slug }).from(categories).where(eq(categories.slug, slug));
  return rows.length > 0;
}

export async function tagSlugExists(slug: string, exceptId?: string): Promise<boolean> {
  const rows = exceptId
    ? await db
        .select({ slug: tags.slug })
        .from(tags)
        .where(and(eq(tags.slug, slug), ne(tags.id, exceptId)))
    : await db.select({ slug: tags.slug }).from(tags).where(eq(tags.slug, slug));
  return rows.length > 0;
}

export function insertCategory(values: CategoryInsertValues): void {
  db.insert(categories).values(values).run();
}

export function updateCategory(id: string, base: Partial<CategoryInsertValues>): boolean {
  const res = db.update(categories).set(base).where(eq(categories.id, id)).run();
  return res.changes > 0;
}

export function deleteCategory(id: string): void {
  db.delete(categories).where(eq(categories.id, id)).run();
}

export function insertTag(values: TagInsertValues): void {
  db.insert(tags).values(values).run();
}

export function updateTag(id: string, base: Partial<TagInsertValues>): boolean {
  const res = db.update(tags).set(base).where(eq(tags.id, id)).run();
  return res.changes > 0;
}

export function deleteTag(id: string): void {
  db.delete(tags).where(eq(tags.id, id)).run();
}

export async function countPostsByCategory(id: string): Promise<number> {
  const [{ c }] = await db
    .select({ c: count() })
    .from(postCategories)
    .where(eq(postCategories.categoryId, id));
  return c;
}

export async function countPostsByTag(id: string): Promise<number> {
  const [{ c }] = await db
    .select({ c: count() })
    .from(postTags)
    .where(eq(postTags.tagId, id));
  return c;
}
