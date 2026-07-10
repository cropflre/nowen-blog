import { Hono } from 'hono';
import * as service from './admin-posts.service';
import { authMiddleware } from '../../middleware/auth';
import { ConflictError } from './admin-posts.service';
import {
  adminPostListQuery,
  postAutosaveSchema,
  postInputSchema,
  postUpdateSchema,
} from './admin-posts.schema';

export const adminPostsRoutes = new Hono<{ Variables: { userId: string } }>();
adminPostsRoutes.use('*', authMiddleware);

adminPostsRoutes.get('/', async (c) => {
  const q = adminPostListQuery.parse(c.req.query());
  return c.json(await service.listPosts({ page: q.page, pageSize: q.pageSize, status: q.status }));
});

adminPostsRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = postInputSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  try {
    return c.json(await service.createPost(parsed.data, c.get('userId')), 201);
  } catch (error) {
    if (error instanceof ConflictError) return c.json({ error: error.message }, 409);
    throw error;
  }
});

adminPostsRoutes.get('/:id/versions', async (c) => {
  const post = await service.getPost(c.req.param('id'));
  if (!post) return c.json({ error: 'Not Found' }, 404);
  return c.json({ items: service.listVersions(post.id) });
});

adminPostsRoutes.get('/:id/versions/:versionId', async (c) => {
  const version = service.getVersion(c.req.param('id'), c.req.param('versionId'));
  if (!version) return c.json({ error: '版本不存在' }, 404);
  return c.json(version);
});

adminPostsRoutes.post('/:id/versions/:versionId/restore', async (c) => {
  try {
    const post = await service.restoreVersion(
      c.req.param('id'),
      c.req.param('versionId'),
      c.get('userId'),
    );
    if (!post) return c.json({ error: '文章或版本不存在' }, 404);
    return c.json(post);
  } catch (error) {
    if (error instanceof ConflictError) return c.json({ error: error.message }, 409);
    throw error;
  }
});

adminPostsRoutes.get('/:id/autosave', async (c) => {
  const post = await service.getPost(c.req.param('id'));
  if (!post) return c.json({ error: 'Not Found' }, 404);
  return c.json({ autosave: await service.getAutosave(post.id, c.get('userId')) });
});

adminPostsRoutes.put('/:id/autosave', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = postAutosaveSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  const autosave = await service.saveAutosave(c.req.param('id'), c.get('userId'), parsed.data);
  if (!autosave) return c.json({ error: 'Not Found' }, 404);
  return c.json(autosave);
});

adminPostsRoutes.delete('/:id/autosave', (c) => {
  service.deleteAutosave(c.req.param('id'), c.get('userId'));
  return c.json({ ok: true });
});

adminPostsRoutes.post('/:id/publish', async (c) => {
  const post = await service.setStatus(c.req.param('id'), 'published', c.get('userId'));
  if (!post) return c.json({ error: 'Not Found' }, 404);
  return c.json(post);
});

adminPostsRoutes.post('/:id/unpublish', async (c) => {
  const post = await service.setStatus(c.req.param('id'), 'draft', c.get('userId'));
  if (!post) return c.json({ error: 'Not Found' }, 404);
  return c.json(post);
});

adminPostsRoutes.post('/:id/archive', async (c) => {
  const post = await service.setStatus(c.req.param('id'), 'archived', c.get('userId'));
  if (!post) return c.json({ error: 'Not Found' }, 404);
  return c.json(post);
});

adminPostsRoutes.post('/:id/restore', async (c) => {
  const post = await service.setStatus(c.req.param('id'), 'draft', c.get('userId'));
  if (!post) return c.json({ error: 'Not Found' }, 404);
  return c.json(post);
});

adminPostsRoutes.get('/:id', async (c) => {
  const post = await service.getPost(c.req.param('id'));
  if (!post) return c.json({ error: 'Not Found' }, 404);
  return c.json(post);
});

adminPostsRoutes.patch('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = postUpdateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误', issues: parsed.error.flatten() }, 400);
  try {
    const post = await service.updatePost(c.req.param('id'), parsed.data, c.get('userId'));
    if (!post) return c.json({ error: 'Not Found' }, 404);
    return c.json(post);
  } catch (error) {
    if (error instanceof ConflictError) return c.json({ error: error.message }, 409);
    throw error;
  }
});

adminPostsRoutes.delete('/:id', async (c) => {
  const ok = await service.deletePost(c.req.param('id'));
  if (!ok) return c.json({ error: 'Not Found' }, 404);
  return c.json({ ok: true });
});
