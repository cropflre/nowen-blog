import { Hono } from 'hono';
import { z } from 'zod';
import { searchPosts } from './search.service';

export const searchRoutes = new Hono();

const searchQuery = z.object({
  q: z.string().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

searchRoutes.get('/', async (c) => {
  const { q, page, pageSize } = searchQuery.parse(c.req.query());
  const result = await searchPosts(q, page, pageSize);
  return c.json(result);
});
