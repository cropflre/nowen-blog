import { Hono } from 'hono';
import { searchPosts } from './search.service';

export const searchRoutes = new Hono();

searchRoutes.get('/', async (c) => {
  const q = (c.req.query('q') ?? '').trim();
  const page = Math.max(1, Number(c.req.query('page') ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 20)));
  const result = await searchPosts(q, { page, pageSize });
  return c.json({ query: q, ...result });
});
