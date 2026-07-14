import { z } from 'zod';

const nullableText = (max: number) =>
  z.union([z.string().trim().max(max), z.null(), z.literal('')]).transform((value) => value || null);

const nullableUrl = z
  .union([z.string().trim().max(500), z.null(), z.literal('')])
  .refine(
    (value) =>
      value === null ||
      value === '' ||
      value.startsWith('/') ||
      value.startsWith('http://') ||
      value.startsWith('https://'),
    '地址必须是 http(s) URL 或站内绝对路径',
  )
  .transform((value) => value || null);

const topics = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .transform((items) => Array.from(new Set(items.map((item) => item.toLowerCase()))));

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1, '项目名称不能为空').max(100),
  slug: z.string().trim().max(120).optional(),
  description: nullableText(500).optional().default(null),
  coverUrl: nullableUrl.optional().default(null),
  homepageUrl: nullableUrl.optional().default(null),
  language: nullableText(60).optional().default(null),
  topics: topics.optional().default([]),
  isFeatured: z.boolean().optional().default(false),
  isPublished: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(-9999).max(9999).optional().default(0),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
