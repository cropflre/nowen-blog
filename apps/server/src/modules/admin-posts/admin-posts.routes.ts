import { Hono } from 'hono';
import { z } from 'zod';
import * as service from './admin-posts.service';
import { authMiddleware } from '../../middleware/auth';
import { ConflictError } from './admin-posts.service';
import {
  adminPostListQuery,
  postInputSchema,
  postUpdateSchema,
} from './admin-posts.schema';

export const adminPostsRoutes = new Hono<{ Variables: { userId: string } }>();

// 文章管理全部需要登录
adminPostsRoutes.use('*', authMiddleware);

adminPostsRoutes.get('/', async (c) => {
  const q = adminPostListQuery.parse(c.req.query());
  const data = await service.listPosts({ page: q.page, pageSize: q.pageSize, status: q.status });
  return c.json(data);
});

adminPostsRoutes.get('/:id', async (c) => {
  const post = await service.getPost(c.req.param('id'));
  if (!post) return c.json({ error: 'Not Found' }, 404);
  return c.json(post);
});

adminPostsRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = postInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  }
  try {
    const post = await service.createPost(parsed.data, c.get('userId'));
    return c.json(post, 201);
  } catch (e) {
    if (e instanceof ConflictError) return c.json({ error: e.message }, 409);
    throw e;
  }
});

adminPostsRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = postUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  }
  try {
    const post = await service.updatePost(c.req.param('id'), parsed.data);
    if (!post) return c.json({ error: 'Not Found' }, 404);
    return c.json(post);
  } catch (e) {
    if (e instanceof ConflictError) return c.json({ error: e.message }, 409);
    throw e;
  }
});

adminPostsRoutes.post('/:id/publish', async (c) => {
  const post = await service.setStatus(c.req.param('id'), 'published');
  if (!post) return c.json({ error: 'Not Found' }, 404);
  return c.json(post);
});

adminPostsRoutes.post('/:id/unpublish', async (c) => {
  const post = await service.setStatus(c.req.param('id'), 'draft');
  if (!post) return c.json({ error: 'Not Found' }, 404);
  return c.json(post);
});

adminPostsRoutes.delete('/:id', async (c) => {
  const ok = await service.deletePost(c.req.param('id'));
  if (!ok) return c.json({ error: 'Not Found' }, 404);
  return c.json({ ok: true });
});
