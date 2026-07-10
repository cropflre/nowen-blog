import { z } from 'zod';

export const postStatusEnum = z.enum(['draft', 'scheduled', 'published', 'archived']);
export const postVisibilityEnum = z.enum(['public', 'private']);

const nullableUrl = z.string().max(500).nullable().optional();

export const postInputBaseSchema = z.object({
  title: z.string().min(1, '标题必填').max(200),
  slug: z.string().max(200).optional(),
  summary: z.string().max(1000).nullable().optional(),
  contentMd: z.string().min(1, '正文必填'),
  coverUrl: nullableUrl,
  status: postStatusEnum.default('draft'),
  visibility: postVisibilityEnum.default('public'),
  isFeatured: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  categoryIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
  canonicalUrl: nullableUrl,
});

function validateSchedule(
  value: { status?: string; scheduledAt?: string | null },
  ctx: z.RefinementCtx,
): void {
  if (value.status !== 'scheduled') return;
  if (!value.scheduledAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scheduledAt'], message: '定时发布必须选择发布时间' });
    return;
  }
  if (new Date(value.scheduledAt).getTime() <= Date.now()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scheduledAt'], message: '定时发布时间必须晚于当前时间' });
  }
}

export const postInputSchema = postInputBaseSchema.superRefine(validateSchedule);
export type PostInput = z.infer<typeof postInputSchema>;

export const postUpdateSchema = postInputBaseSchema.partial().superRefine(validateSchedule);
export type PostUpdate = z.infer<typeof postUpdateSchema>;

export const postAutosaveSchema = postInputBaseSchema.partial().extend({
  title: z.string().max(200).optional(),
  contentMd: z.string().optional(),
});
export type PostAutosaveInput = z.infer<typeof postAutosaveSchema>;

export const adminPostListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: postStatusEnum.optional(),
});
