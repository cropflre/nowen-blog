import { z } from 'zod';

export const feedbackSchema = z.object({
  helpful: z.boolean(),
  reason: z.string().trim().max(120).nullable().optional(),
  comment: z.string().trim().max(1000).nullable().optional(),
});

export async function parseJson(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}
