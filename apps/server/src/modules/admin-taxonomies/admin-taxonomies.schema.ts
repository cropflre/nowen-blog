import { z } from 'zod';

export const categoryInputSchema = z.object({
  name: z.string().min(1, '名称必填'),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export const categoryUpdateSchema = categoryInputSchema.partial();
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;

export const tagInputSchema = z.object({
  name: z.string().min(1, '名称必填'),
  slug: z.string().optional(),
  color: z.string().nullable().optional(),
});
export type TagInput = z.infer<typeof tagInputSchema>;
export const tagUpdateSchema = tagInputSchema.partial();
export type TagUpdate = z.infer<typeof tagUpdateSchema>;
