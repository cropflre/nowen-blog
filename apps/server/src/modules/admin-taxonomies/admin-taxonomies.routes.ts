import { Hono } from 'hono';
import * as service from './admin-taxonomies.service';
import { authMiddleware } from '../../middleware/auth';
import { ConflictError } from './admin-taxonomies.service';
import {
  categoryInputSchema,
  categoryUpdateSchema,
  tagInputSchema,
  tagUpdateSchema,
} from './admin-taxonomies.schema';

export const adminCategoriesRoutes = new Hono<{ Variables: { userId: string } }>();
adminCategoriesRoutes.use('*', authMiddleware);

adminCategoriesRoutes.get('/', async (c) => {
  const items = await service.listCategories();
  return c.json({ items });
});

adminCategoriesRoutes.get('/:id', async (c) => {
  const cat = await service.getCategory(c.req.param('id'));
  if (!cat) return c.json({ error: 'Not Found' }, 404);
  return c.json(cat);
});

adminCategoriesRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = categoryInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  }
  try {
    const cat = await service.createCategory(parsed.data);
    return c.json(cat, 201);
  } catch (e) {
    if (e instanceof ConflictError) return c.json({ error: e.message }, 409);
    throw e;
  }
});

adminCategoriesRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  }
  try {
    const cat = await service.updateCategory(c.req.param('id'), parsed.data);
    if (!cat) return c.json({ error: 'Not Found' }, 404);
    return c.json(cat);
  } catch (e) {
    if (e instanceof ConflictError) return c.json({ error: e.message }, 409);
    throw e;
  }
});

adminCategoriesRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await service.getCategory(id);
  if (!existing) return c.json({ error: 'Not Found' }, 404);
  try {
    await service.deleteCategory(id);
  } catch (e) {
    if (e instanceof ConflictError) return c.json({ error: e.message }, 409);
    throw e;
  }
  return c.json({ ok: true });
});

export const adminTagsRoutes = new Hono<{ Variables: { userId: string } }>();
adminTagsRoutes.use('*', authMiddleware);

adminTagsRoutes.get('/', async (c) => {
  const items = await service.listTags();
  return c.json({ items });
});

adminTagsRoutes.get('/:id', async (c) => {
  const tag = await service.getTag(c.req.param('id'));
  if (!tag) return c.json({ error: 'Not Found' }, 404);
  return c.json(tag);
});

adminTagsRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = tagInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  }
  try {
    const tag = await service.createTag(parsed.data);
    return c.json(tag, 201);
  } catch (e) {
    if (e instanceof ConflictError) return c.json({ error: e.message }, 409);
    throw e;
  }
});

adminTagsRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = tagUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  }
  try {
    const tag = await service.updateTag(c.req.param('id'), parsed.data);
    if (!tag) return c.json({ error: 'Not Found' }, 404);
    return c.json(tag);
  } catch (e) {
    if (e instanceof ConflictError) return c.json({ error: e.message }, 409);
    throw e;
  }
});

adminTagsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await service.getTag(id);
  if (!existing) return c.json({ error: 'Not Found' }, 404);
  try {
    await service.deleteTag(id);
  } catch (e) {
    if (e instanceof ConflictError) return c.json({ error: e.message }, 409);
    throw e;
  }
  return c.json({ ok: true });
});
