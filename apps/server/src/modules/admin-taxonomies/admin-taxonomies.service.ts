import { slugify, randomId, nowIso } from '../../lib/format';
import * as repo from './admin-taxonomies.repository';
import type { CategoryInput, CategoryUpdate, TagInput, TagUpdate } from './admin-taxonomies.schema';

export class ConflictError extends Error {}

async function uniqueSlug(
  base: string,
  exists: (s: string, exceptId?: string) => Promise<boolean>,
  exceptId?: string,
): Promise<string> {
  const root = slugify(base) || 'item';
  if (!(await exists(root, exceptId))) return root;
  let i = 2;
  while (await exists(`${root}-${i}`, exceptId)) i += 1;
  return `${root}-${i}`;
}

async function resolveSlugInput(
  slugInput: string | undefined,
  name: string,
  exists: (s: string, exceptId?: string) => Promise<boolean>,
  exceptId?: string,
): Promise<string> {
  const provided = slugInput?.trim();
  if (!provided) return uniqueSlug(name, exists, exceptId);
  const desired = slugify(provided);
  if (!desired) return uniqueSlug(name, exists, exceptId);
  if (await exists(desired, exceptId)) throw new ConflictError('slug 已存在，请换一个');
  return desired;
}

export async function listCategories() {
  return repo.listCategories();
}
export async function getCategory(id: string) {
  return repo.getCategoryById(id);
}
export async function listTags() {
  return repo.listTags();
}
export async function getTag(id: string) {
  return repo.getTagById(id);
}

export async function createCategory(input: CategoryInput): Promise<repo.CategoryRow> {
  const slug = await resolveSlugInput(input.slug, input.name, repo.categorySlugExists);
  const values: repo.CategoryInsertValues = {
    id: randomId('c_'),
    name: input.name,
    slug,
    description: input.description ?? null,
    color: input.color ?? null,
    sortOrder: input.sortOrder ?? 0,
    createdAt: nowIso(),
  };
  repo.insertCategory(values);
  return (await repo.getCategoryById(values.id))!;
}

export async function updateCategory(
  id: string,
  input: CategoryUpdate,
): Promise<repo.CategoryRow | null> {
  const existing = await repo.getCategoryById(id);
  if (!existing) return null;
  const slug = await resolveSlugInput(input.slug, input.name ?? existing.name, repo.categorySlugExists, id);
  const base: Partial<repo.CategoryInsertValues> = {
    name: input.name ?? existing.name,
    slug,
    description: input.description !== undefined ? input.description ?? null : existing.description,
    color: input.color !== undefined ? input.color ?? null : existing.color,
    sortOrder: input.sortOrder ?? existing.sortOrder,
  };
  if (!repo.updateCategory(id, base)) return null;
  return (await repo.getCategoryById(id))!;
}

export async function deleteCategory(id: string): Promise<void> {
  const count = await repo.countPostsByCategory(id);
  if (count > 0) throw new ConflictError('该分类下仍有文章，不能删除');
  repo.deleteCategory(id);
}

export async function createTag(input: TagInput): Promise<repo.TagRow> {
  const slug = await resolveSlugInput(input.slug, input.name, repo.tagSlugExists);
  const values: repo.TagInsertValues = {
    id: randomId('t_'),
    name: input.name,
    slug,
    color: input.color ?? null,
    createdAt: nowIso(),
  };
  repo.insertTag(values);
  return (await repo.getTagById(values.id))!;
}

export async function updateTag(id: string, input: TagUpdate): Promise<repo.TagRow | null> {
  const existing = await repo.getTagById(id);
  if (!existing) return null;
  const slug = await resolveSlugInput(input.slug, input.name ?? existing.name, repo.tagSlugExists, id);
  const base: Partial<repo.TagInsertValues> = {
    name: input.name ?? existing.name,
    slug,
    color: input.color !== undefined ? input.color ?? null : existing.color,
  };
  if (!repo.updateTag(id, base)) return null;
  return (await repo.getTagById(id))!;
}

export async function deleteTag(id: string): Promise<void> {
  const count = await repo.countPostsByTag(id);
  if (count > 0) throw new ConflictError('该标签下仍有文章，不能删除');
  repo.deleteTag(id);
}
