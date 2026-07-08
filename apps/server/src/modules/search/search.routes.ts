import { Hono } from 'hono';
import { toSummary } from '../../lib/mapping';
import { searchPosts } from '../taxonomies/taxonomies.service';

export const searchRoutes = new Hono();

searchRoutes.get('/', async (c) => {
  const q = (c.req.query('q') ?? '').trim();
  const rows = await searchPosts(q);
  const items = rows.map(toSummary);
  return c.json({ query: q, items, total: items.length });
});
