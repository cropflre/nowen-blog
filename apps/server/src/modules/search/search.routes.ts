import { Hono } from 'hono';
import { z } from 'zod';
import { searchPosts } from './search.service';

const searchQuery = z.object({
  q: z.string().trim().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const searchRoutes = new Hono();

searchRoutes.get('/', async (c) => {
  const parsed = searchQuery.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: '搜索参数错误', issues: parsed.error.flatten() }, 400);
  }
  const { q, page, pageSize } = parsed.data;
  const result = await searchPosts(q, { page, pageSize });
  return c.json({ query: q, ...result });
});
