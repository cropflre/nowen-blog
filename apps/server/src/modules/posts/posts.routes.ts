import { Hono } from 'hono';
import { z } from 'zod';
import * as service from './posts.service';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  category: z.string().optional(),
  tag: z.string().optional(),
});

export const postsRoutes = new Hono();

postsRoutes.get('/', async (c) => {
  const q = listQuery.parse(c.req.query());
  const data = await service.listPublished({
    page: q.page,
    pageSize: q.pageSize,
    categorySlug: q.category,
    tagSlug: q.tag,
  });
  return c.json(data);
});

postsRoutes.get('/featured', async (c) => {
  const items = await service.listFeatured();
  return c.json({ items });
});

postsRoutes.get('/:slug/context', async (c) => {
  const context = await service.getPostContext(c.req.param('slug'));
  if (!context) return c.json({ error: 'Not Found' }, 404);
  return c.json(context);
});

postsRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const post = await service.getPublishedBySlug(slug);
  if (!post) return c.json({ error: 'Not Found' }, 404);
  return c.json(post);
});
