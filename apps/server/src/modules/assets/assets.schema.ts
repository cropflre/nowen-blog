import { z } from 'zod';

export const assetListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** PATCH 仅允许修改元信息，绝不允许改 storageKey / url / mimeType / size。 */
export const assetUpdateSchema = z.object({
  alt: z.string().max(500).nullable().optional(),
  filename: z.string().max(255).nullable().optional(),
});

export type AssetUpdate = z.infer<typeof assetUpdateSchema>;
