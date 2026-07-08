import { z } from 'zod';

export const postStatusEnum = z.enum(['draft', 'published', 'archived']);

export const postInputSchema = z.object({
  title: z.string().min(1, '标题必填'),
  slug: z.string().optional(),
  summary: z.string().nullable().optional(),
  contentMd: z.string().min(1, '正文必填'),
  coverUrl: z.string().nullable().optional(),
  status: postStatusEnum.default('draft'),
  isFeatured: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  categoryIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
});

export type PostInput = z.infer<typeof postInputSchema>;

export const postUpdateSchema = postInputSchema.partial();

export const adminPostListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: postStatusEnum.optional(),
});

export type PostUpdate = z.infer<typeof postUpdateSchema>;
