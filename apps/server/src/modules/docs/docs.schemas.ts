import { z } from 'zod';

const nullableDescription = z.string().trim().max(1000).nullable().optional();

export const spaceCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(120).optional(),
  description: nullableDescription,
  iconUrl: z.string().trim().max(1000).nullable().optional(),
  projectId: z.string().trim().nullable().optional(),
  repositoryFullName: z.string().trim().max(240).nullable().optional(),
  sourceMode: z.enum(['cms', 'github']).default('cms'),
  docsRoot: z.string().trim().max(240).default('docs'),
  isPublished: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(99999).default(0),
});

export const spaceUpdateSchema = spaceCreateSchema.partial();

export const versionCreateSchema = z.object({
  version: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  sourceRef: z.string().trim().max(240).nullable().optional(),
  status: z.enum(['draft', 'published']).default('published'),
  isDefault: z.boolean().default(false),
  isDeprecated: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(99999).default(0),
});

export const versionUpdateSchema = versionCreateSchema.partial();

export const documentCreateSchema = z.object({
  spaceId: z.string().trim().min(1),
  versionId: z.string().trim().min(1),
  parentId: z.string().trim().nullable().optional(),
  title: z.string().trim().min(1).max(240),
  slug: z.string().trim().max(160).optional(),
  path: z.string().trim().max(500).optional(),
  description: nullableDescription,
  contentMd: z.string().default(''),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  visibility: z.enum(['public', 'private']).default('public'),
  sortOrder: z.number().int().min(0).max(99999).default(0),
  editUrl: z.string().trim().max(1000).nullable().optional(),
  seoTitle: z.string().trim().max(240).nullable().optional(),
  seoDescription: z.string().trim().max(500).nullable().optional(),
});

export const documentUpdateSchema = documentCreateSchema.omit({ spaceId: true, versionId: true }).partial();

export const feedbackSchema = z.object({
  helpful: z.boolean(),
  reason: z.string().trim().max(120).nullable().optional(),
  comment: z.string().trim().max(1000).nullable().optional(),
});

export const githubSyncSchema = z.object({
  versionId: z.string().trim().min(1).optional(),
  ref: z.string().trim().max(240).optional(),
  docsRoot: z.string().trim().max(240).optional(),
});

export async function parseJson(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}
