import { Hono } from 'hono';
import { z } from 'zod';
import * as service from './taxonomies.service';
import * as postService from '../posts/posts.service';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const categoriesRoutes = new Hono();

categoriesRoutes.get('/', async (c) => {
  const items = await service.listCategories();
  return c.json({ items });
});

categoriesRoutes.get('/:slug/posts', async (c) => {
  const slug = c.req.param('slug');
  const q = listQuery.parse(c.req.query());
  const data = await postService.listPublished({
    page: q.page,
    pageSize: q.pageSize,
    categorySlug: slug,
  });
  return c.json(data);
});

export const tagsRoutes = new Hono();

tagsRoutes.get('/', async (c) => {
  const items = await service.listTags();
  return c.json({ items });
});

tagsRoutes.get('/:slug/posts', async (c) => {
  const slug = c.req.param('slug');
  const q = listQuery.parse(c.req.query());
  const data = await postService.listPublished({
    page: q.page,
    pageSize: q.pageSize,
    tagSlug: slug,
  });
  return c.json(data);
});
